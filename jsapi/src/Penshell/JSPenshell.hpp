#pragma once

#include "Penshell.hpp"
#include <jqutil_v2/jqutil.h>
#include <memory>
#include <mutex>

using namespace JQUTIL_NS;

class JSPenshell : public JQPublishObject {
private:
    std::unique_ptr<Penshell> penshell;
    std::mutex mutex;

public:
    JSPenshell();
    ~JSPenshell();

    void initialize(JQAsyncInfo& info);
    void exec(JQAsyncInfo& info);
    void write(JQFunctionInfo& info);
    void getWorkingDirectory(JQFunctionInfo& info);
    void close(JQFunctionInfo& info);
    void isRunning(JQFunctionInfo& info);
};

extern JSValue createPenshell(JQModuleEnv* env);