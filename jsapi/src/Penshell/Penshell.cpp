#include "Penshell.hpp"
#include <iostream>
#include <algorithm>
#include <sys/select.h>

Penshell::Penshell() = default;

Penshell::~Penshell() {
    close();
}

void Penshell::initialize() {
    if (running) return;

    int stdinPipe[2];
    int stdoutPipe[2];
    int stderrPipe[2];

    if (pipe(stdinPipe) != 0) throw std::runtime_error("Pipe stdin failed");
    if (pipe(stdoutPipe) != 0) { ::close(stdinPipe[0]); ::close(stdinPipe[1]); throw std::runtime_error("Pipe stdout failed"); }
    if (pipe(stderrPipe) != 0) { ::close(stdinPipe[0]); ::close(stdinPipe[1]); ::close(stdoutPipe[0]); ::close(stdoutPipe[1]); throw std::runtime_error("Pipe stderr failed"); }

    childPid = fork();
    if (childPid == -1) {
        ::close(stdinPipe[0]); ::close(stdinPipe[1]);
        ::close(stdoutPipe[0]); ::close(stdoutPipe[1]);
        ::close(stderrPipe[0]); ::close(stderrPipe[1]);
        throw std::runtime_error("Fork failed");
    }

    if (childPid == 0) {
        // 子进程
        dup2(stdinPipe[0], STDIN_FILENO);
        dup2(stdoutPipe[1], STDOUT_FILENO);
        dup2(stderrPipe[1], STDERR_FILENO);

        ::close(stdinPipe[0]); ::close(stdinPipe[1]);
        ::close(stdoutPipe[0]); ::close(stdoutPipe[1]);
        ::close(stderrPipe[0]); ::close(stderrPipe[1]);

        execl("/bin/sh", "sh", (char*)nullptr);
        _exit(127);
    }

    // 父进程
    ::close(stdinPipe[0]);
    ::close(stdoutPipe[1]);
    ::close(stderrPipe[1]);

    stdinFd = stdinPipe[1];
    stdoutFd = stdoutPipe[0];
    stderrFd = stderrPipe[0];

    running = true;
    readerThread = std::thread(&Penshell::readerLoop, this);
}

std::string Penshell::exec(const std::string& cmd, int timeoutMs) {
    if (!running) throw std::runtime_error("Penshell not initialized");

    std::unique_lock<std::mutex> lock(resultMutex);
    resultBuffer.clear();

    std::string fullCmd = cmd + "\necho " + DONE_MARKER + "\n";
    if (::write(stdinFd, fullCmd.c_str(), fullCmd.size()) < 0) {
        throw std::runtime_error("写入 stdin 失败");
    }

    // 带超时等待，防止交互式命令永久阻塞
    bool completed = resultCV.wait_for(lock, std::chrono::milliseconds(timeoutMs), [this]() {
        return resultBuffer.find(DONE_MARKER) != std::string::npos;
    });

    std::string result = resultBuffer;
    if (completed) {
        // 正常完成，去掉标记行
        size_t markerPos = result.find(DONE_MARKER);
        if (markerPos != std::string::npos) {
            size_t lineStart = result.rfind('\n', markerPos);
            if (lineStart != std::string::npos && lineStart > 0) {
                result = result.substr(0, lineStart);
            } else {
                result = result.substr(0, markerPos);
            }
        }
    }
    // 超时也返回已有内容（交互式命令的输出）

    return result;
}

void Penshell::write(const std::string& input) {
    if (!running || stdinFd < 0) return;
    // 直接写入，不加换行（前端控制换行）
    ::write(stdinFd, input.c_str(), input.size());
}

void Penshell::sendCtrlC() {
    if (!running || stdinFd < 0) return;
    ::write(stdinFd, "\x03", 1);
    // 通知等待中的 exec 解除阻塞
    {
        std::lock_guard<std::mutex> lock(resultMutex);
        resultBuffer += DONE_MARKER;
        resultCV.notify_one();
    }
}

void Penshell::close() {
    if (!running) return;
    running = false;

    {
        std::lock_guard<std::mutex> lock(resultMutex);
        resultBuffer += DONE_MARKER;
        resultCV.notify_all();
    }

    if (stdinFd >= 0) {
        ::write(stdinFd, "exit\n", 5);
    }

    if (stdinFd >= 0) { ::close(stdinFd); stdinFd = -1; }
    if (stdoutFd >= 0) { ::close(stdoutFd); stdoutFd = -1; }
    if (stderrFd >= 0) { ::close(stderrFd); stderrFd = -1; }

    if (childPid > 0) {
        int status;
        waitpid(childPid, &status, WNOHANG);
        childPid = -1;
    }

    readerDone = true;
    if (readerThread.joinable()) {
        readerThread.join();
    }
}

std::string Penshell::getWorkingDirectory() {
    if (!running) return "/";
    try {
        return exec("pwd", 3000);
    } catch (...) {
        return "/";
    }
}

void Penshell::readerLoop() {
    char buffer[4096];
    fd_set readfds;
    int maxFd = std::max(stdoutFd, stderrFd) + 1;

    while (!readerDone) {
        FD_ZERO(&readfds);
        if (stdoutFd >= 0) FD_SET(stdoutFd, &readfds);
        if (stderrFd >= 0) FD_SET(stderrFd, &readfds);

        struct timeval tv;
        tv.tv_sec = 0;
        tv.tv_usec = 100000; // 100ms

        int ret = select(maxFd, &readfds, nullptr, nullptr, &tv);
        if (ret < 0) break;

        bool hasData = false;

        if (stdoutFd >= 0 && FD_ISSET(stdoutFd, &readfds)) {
            ssize_t n = read(stdoutFd, buffer, sizeof(buffer) - 1);
            if (n > 0) {
                buffer[n] = '\0';
                std::string chunk(buffer, n);
                onOutput(chunk);
                hasData = true;
            } else if (n == 0) {
                break;
            }
        }

        if (stderrFd >= 0 && FD_ISSET(stderrFd, &readfds)) {
            ssize_t n = read(stderrFd, buffer, sizeof(buffer) - 1);
            if (n > 0) {
                buffer[n] = '\0';
                std::string chunk(buffer, n);
                onOutput(chunk);
                hasData = true;
            } else if (n == 0) {
                break;
            }
        }

        if (!hasData && !running) break;
    }
}

void Penshell::onOutput(const std::string& chunk) {
    if (outputCallback) {
        outputCallback(chunk);
    }

    std::lock_guard<std::mutex> lock(resultMutex);
    resultBuffer += chunk;
    if (resultBuffer.find(DONE_MARKER) != std::string::npos) {
        resultCV.notify_one();
    }
}
