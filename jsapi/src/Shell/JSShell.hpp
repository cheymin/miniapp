#pragma once

#include "Shell.hpp"
#include <jqutil_v2/jqutil.h>
#include <memory>
#include <mutex>

using namespace JQUTIL_NS;

class JSShell : public JQPublishObject
{
private:
    std::unique_ptr<Shell> shell;
    std::mutex mutex;

    void ensure();

public:
    JSShell();
    ~JSShell();

    void initialize(JQFunctionInfo& info);
    void exec(JQAsyncInfo& info);

    void list(JQAsyncInfo& info);
    void stat(JQAsyncInfo& info);
    void mkdir(JQAsyncInfo& info);
    void removePath(JQAsyncInfo& info);
    void rename(JQAsyncInfo& info);
    void copy(JQAsyncInfo& info);
    void readText(JQAsyncInfo& info);
    void writeText(JQAsyncInfo& info);
    void exists(JQAsyncInfo& info);
};

JSValue createShell(JQModuleEnv* env);
