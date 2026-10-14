#pragma once
#include <SDL3/SDL.h>
#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>
#include <stdexcept>
#include <string>

namespace fog {
// OpenGL entry points are loaded only after the SDL context exists.
struct GlApi {
    PFNGLGETSTRINGPROC GetString{};
    PFNGLGETERRORPROC GetError{};
    PFNGLGETINTEGERVPROC GetIntegerv{};
    PFNGLCLEARCOLORPROC ClearColor{};
    PFNGLCLEARPROC Clear{};
    PFNGLVIEWPORTPROC Viewport{};
    PFNGLDISABLEPROC Disable{};
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
    PFNGLUNIFORM1FPROC Uniform1f{};
    PFNGLUNIFORM2FPROC Uniform2f{};
    PFNGLUNIFORM3FPROC Uniform3f{};
    PFNGLGENVERTEXARRAYSPROC GenVertexArrays{};
    PFNGLBINDVERTEXARRAYPROC BindVertexArray{};
    PFNGLDELETEVERTEXARRAYSPROC DeleteVertexArrays{};
    PFNGLDRAWARRAYSPROC DrawArrays{};
    PFNGLGENTEXTURESPROC GenTextures{};
    PFNGLBINDTEXTUREPROC BindTexture{};
    PFNGLTEXIMAGE2DPROC TexImage2D{};
    PFNGLTEXIMAGE3DPROC TexImage3D{};
    PFNGLTEXPARAMETERIPROC TexParameteri{};
    PFNGLPIXELSTOREIPROC PixelStorei{};
    PFNGLDELETETEXTURESPROC DeleteTextures{};
    PFNGLACTIVETEXTUREPROC ActiveTexture{};
    PFNGLGENFRAMEBUFFERSPROC GenFramebuffers{};
    PFNGLBINDFRAMEBUFFERPROC BindFramebuffer{};
    PFNGLFRAMEBUFFERTEXTURE2DPROC FramebufferTexture2D{};
    PFNGLCHECKFRAMEBUFFERSTATUSPROC CheckFramebufferStatus{};
    PFNGLDELETEFRAMEBUFFERSPROC DeleteFramebuffers{};
    PFNGLREADPIXELSPROC ReadPixels{};

    template <typename Function>
    void loadOne(Function& function, const char* name) {
        function = reinterpret_cast<Function>(SDL_GL_GetProcAddress(name));
        if (!function) {
            throw std::runtime_error(std::string("Missing GL function: ") + name);
        }
    }

    void load() {
        loadOne(GetString, "glGetString");
        loadOne(GetError, "glGetError");
        loadOne(GetIntegerv, "glGetIntegerv");
        loadOne(ClearColor, "glClearColor");
        loadOne(Clear, "glClear");
        loadOne(Viewport, "glViewport");
        loadOne(Disable, "glDisable");
        loadOne(CreateShader, "glCreateShader");
        loadOne(ShaderSource, "glShaderSource");
        loadOne(CompileShader, "glCompileShader");
        loadOne(GetShaderiv, "glGetShaderiv");
        loadOne(GetShaderInfoLog, "glGetShaderInfoLog");
        loadOne(DeleteShader, "glDeleteShader");
        loadOne(CreateProgram, "glCreateProgram");
        loadOne(AttachShader, "glAttachShader");
        loadOne(LinkProgram, "glLinkProgram");
        loadOne(GetProgramiv, "glGetProgramiv");
        loadOne(GetProgramInfoLog, "glGetProgramInfoLog");
        loadOne(DeleteProgram, "glDeleteProgram");
        loadOne(UseProgram, "glUseProgram");
        loadOne(GetUniformLocation, "glGetUniformLocation");
        loadOne(Uniform1i, "glUniform1i");
        loadOne(Uniform1f, "glUniform1f");
        loadOne(Uniform2f, "glUniform2f");
        loadOne(Uniform3f, "glUniform3f");
        loadOne(GenVertexArrays, "glGenVertexArrays");
        loadOne(BindVertexArray, "glBindVertexArray");
        loadOne(DeleteVertexArrays, "glDeleteVertexArrays");
        loadOne(DrawArrays, "glDrawArrays");
        loadOne(GenTextures, "glGenTextures");
        loadOne(BindTexture, "glBindTexture");
        loadOne(TexImage2D, "glTexImage2D");
        loadOne(TexImage3D, "glTexImage3D");
        loadOne(TexParameteri, "glTexParameteri");
        loadOne(PixelStorei, "glPixelStorei");
        loadOne(DeleteTextures, "glDeleteTextures");
        loadOne(ActiveTexture, "glActiveTexture");
        loadOne(GenFramebuffers, "glGenFramebuffers");
        loadOne(BindFramebuffer, "glBindFramebuffer");
        loadOne(FramebufferTexture2D, "glFramebufferTexture2D");
        loadOne(CheckFramebufferStatus, "glCheckFramebufferStatus");
        loadOne(DeleteFramebuffers, "glDeleteFramebuffers");
        loadOne(ReadPixels, "glReadPixels");
    }
};
} // namespace fog
