#define DUMP_BYTECODE 1
#include "quickjs.c"
#undef malloc
#undef free
#undef realloc
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void dump_fn(JSContext *ctx, JSFunctionBytecode *b, int depth, JSFunctionBytecode **seen, int *seen_n)
{
    int i;
    for (i = 0; i < *seen_n; i++) {
        if (seen[i] == b)
            return;
    }
    if (*seen_n < 100000)
        seen[(*seen_n)++] = b;

    printf("\n/* ===== function depth=%d ===== */\n", depth);
    if (b->has_debug) {
        char fnbuf[256];
        const char *fn = b->debug.filename != JS_ATOM_NULL
            ? JS_AtomGetStr(ctx, fnbuf, sizeof(fnbuf), b->debug.filename)
            : "?";
        printf("/* debug: %s:%d source_len=%d */\n", fn, b->debug.line_num, b->debug.source_len);
        if (b->debug.source && b->debug.source_len > 0) {
            printf("/* --- BEGIN SOURCE --- */\n");
            fwrite(b->debug.source, 1, b->debug.source_len, stdout);
            printf("\n/* --- END SOURCE --- */\n");
        }
    }
    js_dump_function_bytecode(ctx, b);

    for (i = 0; i < b->cpool_count; i++) {
        JSValue v = b->cpool[i];
        if (JS_VALUE_GET_TAG(v) == JS_TAG_FUNCTION_BYTECODE) {
            dump_fn(ctx, (JSFunctionBytecode *)JS_VALUE_GET_PTR(v), depth + 1, seen, seen_n);
        }
    }
}

int main(int argc, char **argv)
{
    FILE *f;
    long size;
    uint8_t *buf;
    JSRuntime *rt;
    JSContext *ctx;
    JSValue obj;
    JSFunctionBytecode *b;
    JSFunctionBytecode **seen;
    int seen_n = 0;

    if (argc < 2) {
        fprintf(stderr, "usage: %s file.js.bin\n", argv[0]);
        return 2;
    }
    f = fopen(argv[1], "rb");
    if (!f) { perror("fopen"); return 2; }
    fseek(f, 0, SEEK_END);
    size = ftell(f);
    fseek(f, 0, SEEK_SET);
    buf = malloc(size);
    if (!buf) { perror("malloc"); return 2; }
    if (fread(buf, 1, size, f) != (size_t)size) { perror("fread"); return 2; }
    fclose(f);

    rt = JS_NewRuntime();
    ctx = JS_NewContext(rt);
    obj = JS_ReadObject(ctx, buf, size, JS_READ_OBJ_BYTECODE);
    if (JS_IsException(obj)) {
        JSValue ex = JS_GetException(ctx);
        const char *s = JS_ToCString(ctx, ex);
        fprintf(stderr, "read error: %s\n", s ? s : "(null)");
        if (s) JS_FreeCString(ctx, s);
        JS_FreeValue(ctx, ex);
        return 1;
    }
    if (JS_VALUE_GET_TAG(obj) == JS_TAG_MODULE) {
        JSModuleDef *m = (JSModuleDef *)JS_VALUE_GET_PTR(obj);
        char nbuf[256];
        const char *name = JS_AtomGetStr(ctx, nbuf, sizeof(nbuf), m->module_name);
        fprintf(stderr, "module: %s\n", name ? name : "?");
        if (JS_VALUE_GET_TAG(m->func_obj) != JS_TAG_FUNCTION_BYTECODE) {
            fprintf(stderr, "module func_obj tag=%d\n", JS_VALUE_GET_TAG(m->func_obj));
            return 1;
        }
        b = (JSFunctionBytecode *)JS_VALUE_GET_PTR(m->func_obj);
    } else if (JS_VALUE_GET_TAG(obj) == JS_TAG_FUNCTION_BYTECODE) {
        b = (JSFunctionBytecode *)JS_VALUE_GET_PTR(obj);
    } else {
        fprintf(stderr, "not a function/module bytecode, tag=%d\n", JS_VALUE_GET_TAG(obj));
        return 1;
    }
    seen = calloc(100000, sizeof(*seen));
    dump_fn(ctx, b, 0, seen, &seen_n);
    fprintf(stderr, "\n/* functions dumped: %d */\n", seen_n);
    free(seen);
    JS_FreeValue(ctx, obj);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    free(buf);
    return 0;
}
