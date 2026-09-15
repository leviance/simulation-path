#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <SDL3/SDL.h>

// SDL keeps the OpenGL 1.x function-pointer typedefs behind this opt-in.
// We load every entry point through SDL_GL_GetProcAddress, including the
// functions that originated in OpenGL 1.x, so the typedefs are required.
#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>

#include <string>

namespace lab {

// Checkpoint 1: function pointers được load sau khi OpenGL context đã current.
#if LAB_CHECKPOINT >= 1
struct GlApi {
    PFNGLCLEARCOLORPROC ClearColor{};
    PFNGLCLEARPROC Clear{};
    PFNGLVIEWPORTPROC Viewport{};
    PFNGLSCISSORPROC Scissor{};
    PFNGLENABLEPROC Enable{};
    PFNGLDISABLEPROC Disable{};
    PFNGLGETSTRINGPROC GetString{};
    PFNGLGETERRORPROC GetError{};

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
    PFNGLUNIFORM1FPROC Uniform1f{};
    PFNGLUNIFORM1IPROC Uniform1i{};
    PFNGLUNIFORM2FPROC Uniform2f{};

    PFNGLGENVERTEXARRAYSPROC GenVertexArrays{};
    PFNGLBINDVERTEXARRAYPROC BindVertexArray{};
    PFNGLDELETEVERTEXARRAYSPROC DeleteVertexArrays{};
    PFNGLGENBUFFERSPROC GenBuffers{};
    PFNGLBINDBUFFERPROC BindBuffer{};
    PFNGLBUFFERDATAPROC BufferData{};
    PFNGLDELETEBUFFERSPROC DeleteBuffers{};
    PFNGLENABLEVERTEXATTRIBARRAYPROC EnableVertexAttribArray{};
    PFNGLVERTEXATTRIBPOINTERPROC VertexAttribPointer{};
    PFNGLDRAWARRAYSPROC DrawArrays{};

    PFNGLGENTEXTURESPROC GenTextures{};
    PFNGLBINDTEXTUREPROC BindTexture{};
    PFNGLTEXPARAMETERIPROC TexParameteri{};
    PFNGLTEXIMAGE2DPROC TexImage2D{};
    PFNGLTEXSUBIMAGE2DPROC TexSubImage2D{};
    PFNGLDELETETEXTURESPROC DeleteTextures{};
    PFNGLPIXELSTOREIPROC PixelStorei{};
    PFNGLACTIVETEXTUREPROC ActiveTexture{};
    PFNGLREADPIXELSPROC ReadPixels{};

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
        return loadOne(ClearColor, "glClearColor") &&
            loadOne(Clear, "glClear") &&
            loadOne(Viewport, "glViewport") &&
            loadOne(Scissor, "glScissor") &&
            loadOne(Enable, "glEnable") &&
            loadOne(Disable, "glDisable") &&
            loadOne(GetString, "glGetString") &&
            loadOne(GetError, "glGetError") &&
            loadOne(CreateShader, "glCreateShader") &&
            loadOne(ShaderSource, "glShaderSource") &&
            loadOne(CompileShader, "glCompileShader") &&
            loadOne(GetShaderiv, "glGetShaderiv") &&
            loadOne(GetShaderInfoLog, "glGetShaderInfoLog") &&
            loadOne(DeleteShader, "glDeleteShader") &&
            loadOne(CreateProgram, "glCreateProgram") &&
            loadOne(AttachShader, "glAttachShader") &&
            loadOne(LinkProgram, "glLinkProgram") &&
            loadOne(GetProgramiv, "glGetProgramiv") &&
            loadOne(GetProgramInfoLog, "glGetProgramInfoLog") &&
            loadOne(DeleteProgram, "glDeleteProgram") &&
            loadOne(UseProgram, "glUseProgram") &&
            loadOne(GetUniformLocation, "glGetUniformLocation") &&
            loadOne(Uniform1f, "glUniform1f") &&
            loadOne(Uniform1i, "glUniform1i") &&
            loadOne(Uniform2f, "glUniform2f") &&
            loadOne(GenVertexArrays, "glGenVertexArrays") &&
            loadOne(BindVertexArray, "glBindVertexArray") &&
            loadOne(DeleteVertexArrays, "glDeleteVertexArrays") &&
            loadOne(GenBuffers, "glGenBuffers") &&
            loadOne(BindBuffer, "glBindBuffer") &&
            loadOne(BufferData, "glBufferData") &&
            loadOne(DeleteBuffers, "glDeleteBuffers") &&
            loadOne(EnableVertexAttribArray, "glEnableVertexAttribArray") &&
            loadOne(VertexAttribPointer, "glVertexAttribPointer") &&
            loadOne(DrawArrays, "glDrawArrays") &&
            loadOne(GenTextures, "glGenTextures") &&
            loadOne(BindTexture, "glBindTexture") &&
            loadOne(TexParameteri, "glTexParameteri") &&
            loadOne(TexImage2D, "glTexImage2D") &&
            loadOne(TexSubImage2D, "glTexSubImage2D") &&
            loadOne(DeleteTextures, "glDeleteTextures") &&
            loadOne(PixelStorei, "glPixelStorei") &&
            loadOne(ActiveTexture, "glActiveTexture") &&
            loadOne(ReadPixels, "glReadPixels");
    }
};
#endif

} // namespace lab
