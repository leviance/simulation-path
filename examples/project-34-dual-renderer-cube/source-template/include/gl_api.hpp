#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <SDL3/SDL.h>

// Project load cả function có nguồn gốc từ OpenGL 1.x qua SDL_GL_GetProcAddress.
#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>

#include <string>

namespace lab {

struct GlApi {
    PFNGLCLEARCOLORPROC ClearColor{};
    PFNGLCLEARDEPTHPROC ClearDepth{};
    PFNGLCLEARPROC Clear{};
    PFNGLVIEWPORTPROC Viewport{};
    PFNGLENABLEPROC Enable{};
    PFNGLDISABLEPROC Disable{};
    PFNGLDEPTHFUNCPROC DepthFunc{};
    PFNGLCULLFACEPROC CullFace{};
    PFNGLFRONTFACEPROC FrontFace{};
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
    PFNGLUNIFORM1IPROC Uniform1i{};
    PFNGLUNIFORMMATRIX4FVPROC UniformMatrix4fv{};

    PFNGLGENVERTEXARRAYSPROC GenVertexArrays{};
    PFNGLBINDVERTEXARRAYPROC BindVertexArray{};
    PFNGLDELETEVERTEXARRAYSPROC DeleteVertexArrays{};
    PFNGLGENBUFFERSPROC GenBuffers{};
    PFNGLBINDBUFFERPROC BindBuffer{};
    PFNGLBUFFERDATAPROC BufferData{};
    PFNGLDELETEBUFFERSPROC DeleteBuffers{};
    PFNGLENABLEVERTEXATTRIBARRAYPROC EnableVertexAttribArray{};
    PFNGLVERTEXATTRIBPOINTERPROC VertexAttribPointer{};
    PFNGLDRAWELEMENTSPROC DrawElements{};
    PFNGLDRAWARRAYSPROC DrawArrays{};

    PFNGLGENTEXTURESPROC GenTextures{};
    PFNGLBINDTEXTUREPROC BindTexture{};
    PFNGLTEXPARAMETERIPROC TexParameteri{};
    PFNGLTEXIMAGE2DPROC TexImage2D{};
    PFNGLTEXSUBIMAGE2DPROC TexSubImage2D{};
    PFNGLDELETETEXTURESPROC DeleteTextures{};
    PFNGLPIXELSTOREIPROC PixelStorei{};
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
        return loadOne(ClearColor, "glClearColor") &&
            loadOne(ClearDepth, "glClearDepth") &&
            loadOne(Clear, "glClear") &&
            loadOne(Viewport, "glViewport") &&
            loadOne(Enable, "glEnable") &&
            loadOne(Disable, "glDisable") &&
            loadOne(DepthFunc, "glDepthFunc") &&
            loadOne(CullFace, "glCullFace") &&
            loadOne(FrontFace, "glFrontFace") &&
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
            loadOne(Uniform1i, "glUniform1i") &&
            loadOne(UniformMatrix4fv, "glUniformMatrix4fv") &&
            loadOne(GenVertexArrays, "glGenVertexArrays") &&
            loadOne(BindVertexArray, "glBindVertexArray") &&
            loadOne(DeleteVertexArrays, "glDeleteVertexArrays") &&
            loadOne(GenBuffers, "glGenBuffers") &&
            loadOne(BindBuffer, "glBindBuffer") &&
            loadOne(BufferData, "glBufferData") &&
            loadOne(DeleteBuffers, "glDeleteBuffers") &&
            loadOne(EnableVertexAttribArray, "glEnableVertexAttribArray") &&
            loadOne(VertexAttribPointer, "glVertexAttribPointer") &&
            loadOne(DrawElements, "glDrawElements") &&
            loadOne(DrawArrays, "glDrawArrays") &&
            loadOne(GenTextures, "glGenTextures") &&
            loadOne(BindTexture, "glBindTexture") &&
            loadOne(TexParameteri, "glTexParameteri") &&
            loadOne(TexImage2D, "glTexImage2D") &&
            loadOne(TexSubImage2D, "glTexSubImage2D") &&
            loadOne(DeleteTextures, "glDeleteTextures") &&
            loadOne(PixelStorei, "glPixelStorei") &&
            loadOne(ActiveTexture, "glActiveTexture");
    }
};

} // namespace lab
