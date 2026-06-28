#pragma once

#include <string>
#include <functional>
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <unistd.h>
#include <sys/wait.h>
#include <cstring>
#include <cstdio>
#include <vector>
#include <chrono>

class Penshell {
public:
    Penshell();
    ~Penshell();

    void initialize();
    std::string exec(const std::string& cmd, int timeoutMs = 10000);
    void write(const std::string& input);
    void sendCtrlC();
    void close();
    bool isRunning() const { return running; }
    std::string getWorkingDirectory();

    using OutputCallback = std::function<void(const std::string&)>;
    void setOutputCallback(OutputCallback cb) { outputCallback = std::move(cb); }

private:
    pid_t childPid = -1;
    int stdinFd = -1;
    int stdoutFd = -1;
    int stderrFd = -1;
    std::thread readerThread;
    std::atomic<bool> running{false};
    std::atomic<bool> readerDone{false};
    OutputCallback outputCallback;

    // 用于 exec() 同步等待的命令完成标记
    std::string resultBuffer;
    std::mutex resultMutex;
    std::condition_variable resultCV;
    static constexpr const char* DONE_MARKER = "__PENSHELL_DONE__";

    void readerLoop();
    void onOutput(const std::string& chunk);
};
