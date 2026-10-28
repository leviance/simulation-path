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
    PFNGLSCISSORPROC Scissor{};
    PFNGLPOLYGONMODEPROC PolygonMode{};
    PFNGLREADPIXELSPROC ReadPixels{};
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
    PFNGLUNIFORM3FPROC Uniform3f{};
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
    PFNGLISBUFFERPROC IsBuffer{};
    PFNGLISVERTEXARRAYPROC IsVertexArray{};
    PFNGLISPROGRAMPROC IsProgram{};
    PFNGLISTEXTUREPROC IsTexture{};
    PFNGLFINISHPROC Finish{};
    PFNGLTRANSFORMFEEDBACKVARYINGSPROC TransformFeedbackVaryings{};
    PFNGLBINDBUFFERBASEPROC BindBufferBase{};
    PFNGLBEGINTRANSFORMFEEDBACKPROC BeginTransformFeedback{};
    PFNGLENDTRANSFORMFEEDBACKPROC EndTransformFeedback{};
    PFNGLGETBUFFERSUBDATAPROC GetBufferSubData{};

    // Timing is optional; missing query support must not prevent rendering.
    PFNGLGENQUERIESPROC GenQueries{};
    PFNGLDELETEQUERIESPROC DeleteQueries{};
    PFNGLBEGINQUERYPROC BeginQuery{};
    PFNGLENDQUERYPROC EndQuery{};
    PFNGLGETQUERYIVPROC GetQueryiv{};
    PFNGLGETQUERYOBJECTIVPROC GetQueryObjectiv{};
    PFNGLGETQUERYOBJECTUI64VPROC GetQueryObjectui64v{};

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
        GenQueries = reinterpret_cast<PFNGLGENQUERIESPROC>(SDL_GL_GetProcAddress("glGenQueries"));
        DeleteQueries = reinterpret_cast<PFNGLDELETEQUERIESPROC>(SDL_GL_GetProcAddress("glDeleteQueries"));
        BeginQuery = reinterpret_cast<PFNGLBEGINQUERYPROC>(SDL_GL_GetProcAddress("glBeginQuery"));
        EndQuery = reinterpret_cast<PFNGLENDQUERYPROC>(SDL_GL_GetProcAddress("glEndQuery"));
        GetQueryiv = reinterpret_cast<PFNGLGETQUERYIVPROC>(SDL_GL_GetProcAddress("glGetQueryiv"));
        GetQueryObjectiv = reinterpret_cast<PFNGLGETQUERYOBJECTIVPROC>(SDL_GL_GetProcAddress("glGetQueryObjectiv"));
        GetQueryObjectui64v = reinterpret_cast<PFNGLGETQUERYOBJECTUI64VPROC>(SDL_GL_GetProcAddress("glGetQueryObjectui64v"));
        missingFunction.clear();
        return loadOne(ClearColor, "glClearColor") &&
            loadOne(IsTexture, "glIsTexture") &&
            loadOne(Finish, "glFinish") &&
            loadOne(TransformFeedbackVaryings, "glTransformFeedbackVaryings") &&
            loadOne(BindBufferBase, "glBindBufferBase") &&
            loadOne(BeginTransformFeedback, "glBeginTransformFeedback") &&
            loadOne(EndTransformFeedback, "glEndTransformFeedback") &&
            loadOne(GetBufferSubData, "glGetBufferSubData") &&
            loadOne(ClearDepth, "glClearDepth") &&
            loadOne(Clear, "glClear") &&
            loadOne(Viewport, "glViewport") &&
            loadOne(Scissor, "glScissor") &&
            loadOne(PolygonMode, "glPolygonMode") &&
            loadOne(ReadPixels, "glReadPixels") &&
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
            loadOne(Uniform3f, "glUniform3f") &&
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
            loadOne(IsBuffer, "glIsBuffer") &&
            loadOne(IsVertexArray, "glIsVertexArray") &&
            loadOne(IsProgram, "glIsProgram") &&
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
