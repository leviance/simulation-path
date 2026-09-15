#pragma once

#include <SDL3/SDL.h>

#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>

#include <string>

namespace lab {

// Kế thừa bảng entry point của Project 38; thêm buffer update và fence cho Project 45.
struct GlApi {
    PFNGLGETSTRINGPROC GetString{};
    PFNGLGETERRORPROC GetError{};
    PFNGLGETINTEGERVPROC GetIntegerv{};
    PFNGLGETINTEGERI_VPROC GetIntegeri_v{};
    PFNGLGETINTEGER64VPROC GetInteger64v{};
    PFNGLCLEARCOLORPROC ClearColor{};
    PFNGLCLEARPROC Clear{};
    PFNGLVIEWPORTPROC Viewport{};
    PFNGLENABLEPROC Enable{};
    PFNGLDISABLEPROC Disable{};
    PFNGLBLENDFUNCPROC BlendFunc{};
    PFNGLSCISSORPROC Scissor{};
    PFNGLCREATESHADERPROC CreateShader{};
    PFNGLSHADERSOURCEPROC ShaderSource{};
    PFNGLCOMPILESHADERPROC CompileShader{};
    PFNGLGETSHADERIVPROC GetShaderiv{};
    PFNGLGETSHADERINFOLOGPROC GetShaderInfoLog{};
    PFNGLDELETESHADERPROC DeleteShader{};
    PFNGLCREATEPROGRAMPROC CreateProgram{};
    PFNGLATTACHSHADERPROC AttachShader{};
    PFNGLLINKPROGRAMPROC LinkProgram{};
    PFNGLGETPROGRAMIVPROC GetProgramiv{};
    PFNGLGETPROGRAMINFOLOGPROC GetProgramInfoLog{};
    PFNGLDELETEPROGRAMPROC DeleteProgram{};
    PFNGLUSEPROGRAMPROC UseProgram{};
    PFNGLGETUNIFORMLOCATIONPROC GetUniformLocation{};
    PFNGLUNIFORM1IPROC Uniform1i{};
    PFNGLUNIFORM1UIPROC Uniform1ui{};
    PFNGLUNIFORM1FPROC Uniform1f{};
    PFNGLUNIFORM2FPROC Uniform2f{};
    PFNGLGENBUFFERSPROC GenBuffers{};
    PFNGLBINDBUFFERPROC BindBuffer{};
    PFNGLBUFFERDATAPROC BufferData{};
    PFNGLBUFFERSUBDATAPROC BufferSubData{};
    PFNGLFENCESYNCPROC FenceSync{};
    PFNGLCLIENTWAITSYNCPROC ClientWaitSync{};
    PFNGLDELETESYNCPROC DeleteSync{};
    PFNGLFLUSHPROC Flush{};
    PFNGLBINDBUFFERBASEPROC BindBufferBase{};
    PFNGLGETBUFFERSUBDATAPROC GetBufferSubData{};
    PFNGLDELETEBUFFERSPROC DeleteBuffers{};
    PFNGLDISPATCHCOMPUTEPROC DispatchCompute{};
    PFNGLMEMORYBARRIERPROC MemoryBarrier{};
    PFNGLGENVERTEXARRAYSPROC GenVertexArrays{};
    PFNGLBINDVERTEXARRAYPROC BindVertexArray{};
    PFNGLDELETEVERTEXARRAYSPROC DeleteVertexArrays{};
    PFNGLDRAWARRAYSPROC DrawArrays{};
    PFNGLGENQUERIESPROC GenQueries{};
    PFNGLDELETEQUERIESPROC DeleteQueries{};
    PFNGLBEGINQUERYPROC BeginQuery{};
    PFNGLENDQUERYPROC EndQuery{};
    PFNGLGETQUERYOBJECTIVPROC GetQueryObjectiv{};
    PFNGLGETQUERYOBJECTUI64VPROC GetQueryObjectui64v{};

    std::string missingFunction{};

    template <typename Function>
    bool loadOne(Function& destination, const char* name) {
        destination = reinterpret_cast<Function>(SDL_GL_GetProcAddress(name));
        if (destination) {
            return true;
        }
        missingFunction = name;
        return false;
    }

    bool load() {
        missingFunction.clear();
#define LOAD_GL_FUNCTION(member)          \
    if (!loadOne(member, "gl" #member)) { \
        return false;                     \
    }
        LOAD_GL_FUNCTION(GetString)
        LOAD_GL_FUNCTION(GetError)
        LOAD_GL_FUNCTION(GetIntegerv)
        LOAD_GL_FUNCTION(GetIntegeri_v)
        LOAD_GL_FUNCTION(GetInteger64v)
        LOAD_GL_FUNCTION(ClearColor)
        LOAD_GL_FUNCTION(Clear)
        LOAD_GL_FUNCTION(Viewport)
        LOAD_GL_FUNCTION(Enable)
        LOAD_GL_FUNCTION(Disable)
        LOAD_GL_FUNCTION(BlendFunc)
        LOAD_GL_FUNCTION(Scissor)
        LOAD_GL_FUNCTION(CreateShader)
        LOAD_GL_FUNCTION(ShaderSource)
        LOAD_GL_FUNCTION(CompileShader)
        LOAD_GL_FUNCTION(GetShaderiv)
        LOAD_GL_FUNCTION(GetShaderInfoLog)
        LOAD_GL_FUNCTION(DeleteShader)
        LOAD_GL_FUNCTION(CreateProgram)
        LOAD_GL_FUNCTION(AttachShader)
        LOAD_GL_FUNCTION(LinkProgram)
        LOAD_GL_FUNCTION(GetProgramiv)
        LOAD_GL_FUNCTION(GetProgramInfoLog)
        LOAD_GL_FUNCTION(DeleteProgram)
        LOAD_GL_FUNCTION(UseProgram)
        LOAD_GL_FUNCTION(GetUniformLocation)
        LOAD_GL_FUNCTION(Uniform1i)
        LOAD_GL_FUNCTION(Uniform1ui)
        LOAD_GL_FUNCTION(Uniform1f)
        LOAD_GL_FUNCTION(Uniform2f)
        LOAD_GL_FUNCTION(GenBuffers)
        LOAD_GL_FUNCTION(BindBuffer)
        LOAD_GL_FUNCTION(BufferData)
        LOAD_GL_FUNCTION(BufferSubData)
        LOAD_GL_FUNCTION(FenceSync)
        LOAD_GL_FUNCTION(ClientWaitSync)
        LOAD_GL_FUNCTION(DeleteSync)
        LOAD_GL_FUNCTION(Flush)
        LOAD_GL_FUNCTION(BindBufferBase)
        LOAD_GL_FUNCTION(GetBufferSubData)
        LOAD_GL_FUNCTION(DeleteBuffers)
        LOAD_GL_FUNCTION(DispatchCompute)
        LOAD_GL_FUNCTION(MemoryBarrier)
        LOAD_GL_FUNCTION(GenVertexArrays)
        LOAD_GL_FUNCTION(BindVertexArray)
        LOAD_GL_FUNCTION(DeleteVertexArrays)
        LOAD_GL_FUNCTION(DrawArrays)
        LOAD_GL_FUNCTION(GenQueries)
        LOAD_GL_FUNCTION(DeleteQueries)
        LOAD_GL_FUNCTION(BeginQuery)
        LOAD_GL_FUNCTION(EndQuery)
        LOAD_GL_FUNCTION(GetQueryObjectiv)
        LOAD_GL_FUNCTION(GetQueryObjectui64v)
#undef LOAD_GL_FUNCTION
        return true;
    }
};

} // namespace lab
