#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <SDL3/SDL.h>

#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>

#include <string>

namespace lab {

// SDL tạo context; bảng này nạp rõ từng entry point OpenGL 3.3 mà project dùng.
struct GlApi {
    PFNGLCLEARCOLORPROC ClearColor{};
    PFNGLCLEARPROC Clear{};
    PFNGLVIEWPORTPROC Viewport{};
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
    PFNGLUNIFORM3FPROC Uniform3f{};
    PFNGLGENVERTEXARRAYSPROC GenVertexArrays{};
    PFNGLBINDVERTEXARRAYPROC BindVertexArray{};
    PFNGLDELETEVERTEXARRAYSPROC DeleteVertexArrays{};
    PFNGLDRAWARRAYSPROC DrawArrays{};

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
        LOAD_GL_FUNCTION(ClearColor)
        LOAD_GL_FUNCTION(Clear)
        LOAD_GL_FUNCTION(Viewport)
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
        LOAD_GL_FUNCTION(Uniform1f)
        LOAD_GL_FUNCTION(Uniform1i)
        LOAD_GL_FUNCTION(Uniform2f)
        LOAD_GL_FUNCTION(Uniform3f)
        LOAD_GL_FUNCTION(GenVertexArrays)
        LOAD_GL_FUNCTION(BindVertexArray)
        LOAD_GL_FUNCTION(DeleteVertexArrays)
        LOAD_GL_FUNCTION(DrawArrays)
#undef LOAD_GL_FUNCTION
        return true;
    }
};

} // namespace lab
