#pragma once

#include <SDL3/SDL.h>

#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>

#include <string>

namespace chamber {

// SDL tạo context; bảng này chỉ nạp các entry point mà Project 38 thực sự dùng.
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

    PFNGLUNIFORM3FPROC Uniform3f{};
    PFNGLUNIFORMMATRIX4FVPROC UniformMatrix4fv{};
    PFNGLBUFFERSUBDATAPROC BufferSubData{};
    PFNGLGETBUFFERPARAMETERI64VPROC GetBufferParameteri64v{};
    PFNGLVERTEXATTRIBPOINTERPROC VertexAttribPointer{};
    PFNGLENABLEVERTEXATTRIBARRAYPROC EnableVertexAttribArray{};
    PFNGLDEPTHMASKPROC DepthMask{};
    PFNGLFENCESYNCPROC FenceSync{};
    PFNGLCLIENTWAITSYNCPROC ClientWaitSync{};
    PFNGLDELETESYNCPROC DeleteSync{};
    PFNGLFLUSHPROC Flush{};
    PFNGLREADPIXELSPROC ReadPixels{};
    PFNGLPIXELSTOREIPROC PixelStorei{};
    PFNGLISBUFFERPROC IsBuffer{};
    PFNGLISPROGRAMPROC IsProgram{};
    PFNGLISVERTEXARRAYPROC IsVertexArray{};
    PFNGLGENFRAMEBUFFERSPROC GenFramebuffers{};
    PFNGLBINDFRAMEBUFFERPROC BindFramebuffer{};
    PFNGLFRAMEBUFFERTEXTURE2DPROC FramebufferTexture2D{};
    PFNGLCHECKFRAMEBUFFERSTATUSPROC CheckFramebufferStatus{};
    PFNGLDELETEFRAMEBUFFERSPROC DeleteFramebuffers{};
    PFNGLGENTEXTURESPROC GenTextures{};
    PFNGLBINDTEXTUREPROC BindTexture{};
    PFNGLTEXIMAGE2DPROC TexImage2D{};
    PFNGLTEXPARAMETERIPROC TexParameteri{};
    PFNGLDELETETEXTURESPROC DeleteTextures{};
    PFNGLACTIVETEXTUREPROC ActiveTexture{};

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
        LOAD_GL_FUNCTION(Uniform3f)
        LOAD_GL_FUNCTION(UniformMatrix4fv)
        LOAD_GL_FUNCTION(BufferSubData)
        LOAD_GL_FUNCTION(GetBufferParameteri64v)
        LOAD_GL_FUNCTION(VertexAttribPointer)
        LOAD_GL_FUNCTION(EnableVertexAttribArray)
        LOAD_GL_FUNCTION(DepthMask)
        LOAD_GL_FUNCTION(FenceSync)
        LOAD_GL_FUNCTION(ClientWaitSync)
        LOAD_GL_FUNCTION(DeleteSync)
        LOAD_GL_FUNCTION(Flush)
        LOAD_GL_FUNCTION(ReadPixels)
        LOAD_GL_FUNCTION(PixelStorei)
        LOAD_GL_FUNCTION(IsBuffer)
        LOAD_GL_FUNCTION(IsProgram)
        LOAD_GL_FUNCTION(IsVertexArray)
        LOAD_GL_FUNCTION(GenFramebuffers)
        LOAD_GL_FUNCTION(BindFramebuffer)
        LOAD_GL_FUNCTION(FramebufferTexture2D)
        LOAD_GL_FUNCTION(CheckFramebufferStatus)
        LOAD_GL_FUNCTION(DeleteFramebuffers)
        LOAD_GL_FUNCTION(GenTextures)
        LOAD_GL_FUNCTION(BindTexture)
        LOAD_GL_FUNCTION(TexImage2D)
        LOAD_GL_FUNCTION(TexParameteri)
        LOAD_GL_FUNCTION(DeleteTextures)
        LOAD_GL_FUNCTION(ActiveTexture)
#undef LOAD_GL_FUNCTION
        return true;
    }
};

} // namespace chamber
