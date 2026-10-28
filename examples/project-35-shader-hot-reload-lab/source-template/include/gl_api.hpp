#pragma once
#include <SDL3/SDL.h>
#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>
#include <string>

namespace lab {
// Load after the context is current. No GL calls survive its lifetime.
struct GlApi {
    PFNGLCLEARCOLORPROC ClearColor{};
    PFNGLCLEARPROC Clear{};
    PFNGLVIEWPORTPROC Viewport{};
    PFNGLDISABLEPROC Disable{};
    PFNGLGETSTRINGPROC GetString{};
    PFNGLGETERRORPROC GetError{};
    PFNGLGETINTEGERVPROC GetIntegerv{};
    PFNGLREADPIXELSPROC ReadPixels{};
    PFNGLCREATESHADERPROC CreateShader{};
    PFNGLSHADERSOURCEPROC ShaderSource{};
    PFNGLCOMPILESHADERPROC CompileShader{};
    PFNGLGETSHADERIVPROC GetShaderiv{};
    PFNGLGETSHADERINFOLOGPROC GetShaderInfoLog{};
    PFNGLDELETESHADERPROC DeleteShader{};
    PFNGLCREATEPROGRAMPROC CreateProgram{};
    PFNGLATTACHSHADERPROC AttachShader{};
    PFNGLDETACHSHADERPROC DetachShader{};
    PFNGLLINKPROGRAMPROC LinkProgram{};
    PFNGLGETPROGRAMIVPROC GetProgramiv{};
    PFNGLGETPROGRAMINFOLOGPROC GetProgramInfoLog{};
    PFNGLDELETEPROGRAMPROC DeleteProgram{};
    PFNGLUSEPROGRAMPROC UseProgram{};
    PFNGLGETUNIFORMLOCATIONPROC GetUniformLocation{};
    PFNGLGETACTIVEUNIFORMPROC GetActiveUniform{};
    PFNGLGETUNIFORMFVPROC GetUniformfv{};
    PFNGLUNIFORM1FPROC Uniform1f{};
    PFNGLUNIFORM2FPROC Uniform2f{};
    PFNGLUNIFORM1IPROC Uniform1i{};
    PFNGLGENVERTEXARRAYSPROC GenVertexArrays{};
    PFNGLBINDVERTEXARRAYPROC BindVertexArray{};
    PFNGLDELETEVERTEXARRAYSPROC DeleteVertexArrays{};
    PFNGLISSHADERPROC IsShader{};
    PFNGLISPROGRAMPROC IsProgram{};
    PFNGLISVERTEXARRAYPROC IsVertexArray{};
    PFNGLISTEXTUREPROC IsTexture{};
    PFNGLDRAWARRAYSPROC DrawArrays{};
    PFNGLGENTEXTURESPROC GenTextures{};
    PFNGLBINDTEXTUREPROC BindTexture{};
    PFNGLDELETETEXTURESPROC DeleteTextures{};
    PFNGLTEXPARAMETERIPROC TexParameteri{};
    PFNGLTEXIMAGE2DPROC TexImage2D{};
    PFNGLTEXSUBIMAGE2DPROC TexSubImage2D{};
    PFNGLPIXELSTOREIPROC PixelStorei{};
    PFNGLACTIVETEXTUREPROC ActiveTexture{};
    std::string missingFunction{};

    template <class Function>
    bool loadOne(Function& destination, const char* name) {
        destination = reinterpret_cast<Function>(SDL_GL_GetProcAddress(name));
        if (destination)
            return true;
        missingFunction = name;
        return false;
    }

    bool load() {
        missingFunction.clear();
        return loadOne(ClearColor, "glClearColor") &&
            loadOne(Clear, "glClear") &&
            loadOne(Viewport, "glViewport") &&
            loadOne(Disable, "glDisable") &&
            loadOne(GetString, "glGetString") &&
            loadOne(GetError, "glGetError") &&
            loadOne(GetIntegerv, "glGetIntegerv") &&
            loadOne(ReadPixels, "glReadPixels") &&
            loadOne(CreateShader, "glCreateShader") &&
            loadOne(ShaderSource, "glShaderSource") &&
            loadOne(CompileShader, "glCompileShader") &&
            loadOne(GetShaderiv, "glGetShaderiv") &&
            loadOne(GetShaderInfoLog, "glGetShaderInfoLog") &&
            loadOne(DeleteShader, "glDeleteShader") &&
            loadOne(CreateProgram, "glCreateProgram") &&
            loadOne(AttachShader, "glAttachShader") &&
            loadOne(DetachShader, "glDetachShader") &&
            loadOne(LinkProgram, "glLinkProgram") &&
            loadOne(GetProgramiv, "glGetProgramiv") &&
            loadOne(GetProgramInfoLog, "glGetProgramInfoLog") &&
            loadOne(DeleteProgram, "glDeleteProgram") &&
            loadOne(UseProgram, "glUseProgram") &&
            loadOne(GetUniformLocation, "glGetUniformLocation") &&
            loadOne(GetActiveUniform, "glGetActiveUniform") &&
            loadOne(GetUniformfv, "glGetUniformfv") &&
            loadOne(Uniform1f, "glUniform1f") &&
            loadOne(Uniform2f, "glUniform2f") &&
            loadOne(Uniform1i, "glUniform1i") &&
            loadOne(GenVertexArrays, "glGenVertexArrays") &&
            loadOne(BindVertexArray, "glBindVertexArray") &&
            loadOne(DeleteVertexArrays, "glDeleteVertexArrays") &&
            loadOne(IsShader, "glIsShader") &&
            loadOne(IsProgram, "glIsProgram") &&
            loadOne(IsVertexArray, "glIsVertexArray") &&
            loadOne(IsTexture, "glIsTexture") &&
            loadOne(DrawArrays, "glDrawArrays") &&
            loadOne(GenTextures, "glGenTextures") &&
            loadOne(BindTexture, "glBindTexture") &&
            loadOne(DeleteTextures, "glDeleteTextures") &&
            loadOne(TexParameteri, "glTexParameteri") &&
            loadOne(TexImage2D, "glTexImage2D") &&
            loadOne(TexSubImage2D, "glTexSubImage2D") &&
            loadOne(PixelStorei, "glPixelStorei") &&
            loadOne(ActiveTexture, "glActiveTexture");
    }
};
} // namespace lab
