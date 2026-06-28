#include "JSPenshell.hpp"
#include <Exceptions/AssertFailed.hpp>

JSPenshell::JSPenshell() {}
JSPenshell::~JSPenshell() {}

void JSPenshell::initialize(JQAsyncInfo& info) {
    try {
        ASSERT(info.Length() == 0);
        std::lock_guard<std::mutex> lock(mutex);
        penshell = std::make_unique<Penshell>();

        penshell->setOutputCallback([this](const std::string& chunk) {
            publish("penshell_output", chunk);
        });

        penshell->initialize();
        info.post(true);
    } catch (const std::exception& e) {
        info.postError(e.what());
    }
}

void JSPenshell::exec(JQAsyncInfo& info) {
    try {
        ASSERT(penshell != nullptr);
        ASSERT(info.Length() == 1);
        ASSERT(info[0].is_string());

        std::string cmd = info[0].string_value();
        std::string output = penshell->exec(cmd);
        info.post(output);
    } catch (const std::exception& e) {
        info.postError(e.what());
    }
}

void JSPenshell::write(JQFunctionInfo& info) {
    try {
        ASSERT(penshell != nullptr);
        ASSERT(info.Length() == 1);

        JSContext* ctx = info.GetContext();
        JSValueConst arg = info[0];
        if (!JS_IsString(arg)) {
            info.GetReturnValue().ThrowTypeError("参数必须是字符串");
            return;
        }
        const char* str = JS_ToCString(ctx, arg);
        if (!str) {
            info.GetReturnValue().ThrowInternalError("字符串转换失败");
            return;
        }
        std::string input(str);
        JS_FreeCString(ctx, str);

        penshell->write(input);
        info.GetReturnValue().Set(true);
    } catch (const std::exception& e) {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSPenshell::getWorkingDirectory(JQFunctionInfo& info) {
    try {
        ASSERT(penshell != nullptr);
        ASSERT(info.Length() == 0);
        info.GetReturnValue().Set(penshell->getWorkingDirectory());
    } catch (const std::exception& e) {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSPenshell::sendCtrlC(JQFunctionInfo& info) {
    try {
        ASSERT(penshell != nullptr);
        ASSERT(info.Length() == 0);
        penshell->sendCtrlC();
        info.GetReturnValue().Set(true);
    } catch (const std::exception& e) {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSPenshell::close(JQFunctionInfo& info) {
    try {
        ASSERT(penshell != nullptr);
        ASSERT(info.Length() == 0);
        penshell->close();
        info.GetReturnValue().Set(true);
    } catch (const std::exception& e) {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

void JSPenshell::isRunning(JQFunctionInfo& info) {
    try {
        ASSERT(penshell != nullptr);
        ASSERT(info.Length() == 0);
        info.GetReturnValue().Set(penshell->isRunning());
    } catch (const std::exception& e) {
        info.GetReturnValue().ThrowInternalError(e.what());
    }
}

JSValue createPenshell(JQModuleEnv* env) {
    JQFunctionTemplateRef tpl = JQFunctionTemplate::New(env, "Penshell");
    tpl->InstanceTemplate()->setObjectCreator([]() {
        return new JSPenshell();
    });

    tpl->SetProtoMethodPromise("initialize", &JSPenshell::initialize);
    tpl->SetProtoMethodPromise("exec", &JSPenshell::exec);
    tpl->SetProtoMethod("write", &JSPenshell::write);
    tpl->SetProtoMethod("sendCtrlC", &JSPenshell::sendCtrlC);
    tpl->SetProtoMethod("getWorkingDirectory", &JSPenshell::getWorkingDirectory);
    tpl->SetProtoMethod("close", &JSPenshell::close);
    tpl->SetProtoMethod("isRunning", &JSPenshell::isRunning);

    JSPenshell::InitTpl(tpl);
    return tpl->CallConstructor();
}