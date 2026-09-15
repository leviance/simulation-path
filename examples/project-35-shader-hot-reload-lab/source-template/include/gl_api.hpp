#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#include <SDL3/SDL.h>

#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>

#include <string>

namespace lab {

// SDL only creates the OpenGL context. Modern OpenGL entry points still need to
// be resolved from that context, so this table keeps loading and later calls
// explicit without introducing another dependency such as GLAD or GLEW.
struct GlApi {
    PFNGLCLEARCOLORPROC ClearColor{};
    PFNGLCLEARDEPTHPROC ClearDepth{};
    PFNGLCLEARPROC Clear{};
    PFNGLVIEWPORTPROC Viewport{};
    PFNGLENABLEPROC Enable{};
    PFNGLDEPTHFUNCPROC DepthFunc{};
    PFNGLCULLFACEPROC CullFace{};
    PFNGLFRONTFACEPROC FrontFace{};
    PFNGLGETSTRINGPROC GetString{};
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
    PFNGLUNIFORMMATRIX4FVPROC UniformMatrix4fv{};
    PFNGLUNIFORM1FPROC Uniform1f{};
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
    PFNGLDRAWELEMENTSPROC DrawElements{};

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
        // Stop at the first missing function and preserve its name. The caller
        // can then report a useful startup error instead of crashing on a null
        // function pointer during the first frame.
#define LOAD_GL_FUNCTION(member)          \
    if (!loadOne(member, "gl" #member)) { \
        return false;                     \
    }
        LOAD_GL_FUNCTION(ClearColor)
        LOAD_GL_FUNCTION(ClearDepth)
        LOAD_GL_FUNCTION(Clear)
        LOAD_GL_FUNCTION(Viewport)
        LOAD_GL_FUNCTION(Enable)
        LOAD_GL_FUNCTION(DepthFunc)
        LOAD_GL_FUNCTION(CullFace)
        LOAD_GL_FUNCTION(FrontFace)
        LOAD_GL_FUNCTION(GetString)
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
        LOAD_GL_FUNCTION(UniformMatrix4fv)
        LOAD_GL_FUNCTION(Uniform1f)
        LOAD_GL_FUNCTION(Uniform2f)
        LOAD_GL_FUNCTION(GenVertexArrays)
        LOAD_GL_FUNCTION(BindVertexArray)
        LOAD_GL_FUNCTION(DeleteVertexArrays)
        LOAD_GL_FUNCTION(GenBuffers)
        LOAD_GL_FUNCTION(BindBuffer)
        LOAD_GL_FUNCTION(BufferData)
        LOAD_GL_FUNCTION(DeleteBuffers)
        LOAD_GL_FUNCTION(EnableVertexAttribArray)
        LOAD_GL_FUNCTION(VertexAttribPointer)
        LOAD_GL_FUNCTION(DrawElements)
#undef LOAD_GL_FUNCTION
        return true;
    }
};

} // namespace lab
