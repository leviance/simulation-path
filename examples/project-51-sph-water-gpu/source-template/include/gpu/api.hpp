#pragma once
#include <SDL3/SDL.h>
#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>
#include <stdexcept>
#include <string>

// This is an entry-point table, not a graphics or physics engine.
#define WATER51_GL_FUNCTIONS(X)                                                                                                                                                                                                                                                                                   \
    X(PFNGLGETSTRINGPROC, GetString)                                                                                                                                                                                                                                                                              \
    X(PFNGLGETERRORPROC, GetError)                                                                                                                                                                                                                                                                                \
    X(PFNGLGETINTEGERVPROC, GetIntegerv)                                                                                                                                                                                                                                                                          \
    X(PFNGLGETINTEGERI_VPROC, GetIntegeri_v)                                                                                                                                                                                                                                                                      \
    X(PFNGLGETINTEGER64VPROC, GetInteger64v)                                                                                                                                                                                                                                                                      \
    X(PFNGLCLEARCOLORPROC, ClearColor)                                                                                                                                                                                                                                                                            \
    X(PFNGLCLEARPROC, Clear)                                                                                                                                                                                                                                                                                      \
    X(PFNGLCLEARBUFFERFVPROC, ClearBufferfv)                                                                                                                                                                                                                                                                      \
    X(PFNGLVIEWPORTPROC, Viewport)                                                                                                                                                                                                                                                                                \
    X(PFNGLENABLEPROC, Enable)                                                                                                                                                                                                                                                                                    \
    X(PFNGLDISABLEPROC, Disable)                                                                                                                                                                                                                                                                                  \
    X(PFNGLSCISSORPROC, Scissor)                                                                                                                                                                                                                                                                                  \
    X(PFNGLBLENDFUNCPROC, BlendFunc)                                                                                                                                                                                                                                                                              \
    X(PFNGLBLENDEQUATIONPROC, BlendEquation) X(PFNGLDEPTHFUNCPROC, DepthFunc) X(PFNGLDEPTHMASKPROC, DepthMask)                                                                                                                                                                                                    \
        X(PFNGLCREATESHADERPROC, CreateShader) X(PFNGLSHADERSOURCEPROC, ShaderSource) X(PFNGLCOMPILESHADERPROC, CompileShader)                                                                                                                                                                                    \
            X(PFNGLGETSHADERIVPROC, GetShaderiv) X(PFNGLGETSHADERINFOLOGPROC, GetShaderInfoLog) X(PFNGLDELETESHADERPROC, DeleteShader)                                                                                                                                                                            \
                X(PFNGLCREATEPROGRAMPROC, CreateProgram) X(PFNGLATTACHSHADERPROC, AttachShader) X(PFNGLLINKPROGRAMPROC, LinkProgram)                                                                                                                                                                              \
                    X(PFNGLGETPROGRAMIVPROC, GetProgramiv) X(PFNGLGETPROGRAMINFOLOGPROC, GetProgramInfoLog) X(PFNGLDELETEPROGRAMPROC, DeleteProgram) X(PFNGLUSEPROGRAMPROC, UseProgram)                                                                                                                           \
                        X(PFNGLGETUNIFORMLOCATIONPROC, GetUniformLocation) X(PFNGLUNIFORM1IPROC, Uniform1i) X(PFNGLUNIFORM1UIPROC, Uniform1ui)                                                                                                                                                                    \
                            X(PFNGLUNIFORM1FPROC, Uniform1f) X(PFNGLUNIFORM2FPROC, Uniform2f) X(PFNGLUNIFORM3FPROC, Uniform3f) X(PFNGLUNIFORM4FPROC, Uniform4f) X(PFNGLUNIFORM3IPROC, Uniform3i)                                                                                                                  \
                                X(PFNGLGENBUFFERSPROC, GenBuffers) X(PFNGLBINDBUFFERPROC, BindBuffer) X(PFNGLBUFFERDATAPROC, BufferData) X(PFNGLBUFFERSUBDATAPROC, BufferSubData)                                                                                                                                 \
                                    X(PFNGLGETBUFFERSUBDATAPROC, GetBufferSubData) X(PFNGLDELETEBUFFERSPROC, DeleteBuffers) X(PFNGLBINDBUFFERBASEPROC, BindBufferBase) X(PFNGLCOPYBUFFERSUBDATAPROC, CopyBufferSubData)                                                                                           \
                                        X(PFNGLGENVERTEXARRAYSPROC, GenVertexArrays) X(PFNGLBINDVERTEXARRAYPROC, BindVertexArray) X(PFNGLDELETEVERTEXARRAYSPROC, DeleteVertexArrays)                                                                                                                              \
                                            X(PFNGLVERTEXATTRIBPOINTERPROC, VertexAttribPointer) X(PFNGLENABLEVERTEXATTRIBARRAYPROC, EnableVertexAttribArray)                                                                                                                                                     \
                                                X(PFNGLDRAWARRAYSPROC, DrawArrays) X(PFNGLDRAWARRAYSINSTANCEDPROC, DrawArraysInstanced) X(PFNGLDISPATCHCOMPUTEPROC, DispatchCompute) X(PFNGLMEMORYBARRIERPROC, MemoryBarrier)                                                                                     \
                                                    X(PFNGLFENCESYNCPROC, FenceSync) X(PFNGLCLIENTWAITSYNCPROC, ClientWaitSync) X(PFNGLDELETESYNCPROC, DeleteSync) X(PFNGLFLUSHPROC, Flush)                                                                                                                       \
                                                        X(PFNGLGETQUERYIVPROC, GetQueryiv) X(PFNGLGENQUERIESPROC, GenQueries) X(PFNGLQUERYCOUNTERPROC, QueryCounter) X(PFNGLGETQUERYOBJECTIVPROC, GetQueryObjectiv) X(PFNGLGETQUERYOBJECTUI64VPROC, GetQueryObjectui64v) X(PFNGLDELETEQUERIESPROC, DeleteQueries) \
                                                            X(PFNGLGENTEXTURESPROC, GenTextures) X(PFNGLBINDTEXTUREPROC, BindTexture) X(PFNGLACTIVETEXTUREPROC, ActiveTexture) X(PFNGLTEXPARAMETERIPROC, TexParameteri)                                                                                           \
                                                                X(PFNGLTEXIMAGE2DPROC, TexImage2D) X(PFNGLTEXSUBIMAGE2DPROC, TexSubImage2D) X(PFNGLDELETETEXTURESPROC, DeleteTextures)                                                                                                                            \
                                                                    X(PFNGLGENFRAMEBUFFERSPROC, GenFramebuffers) X(PFNGLBINDFRAMEBUFFERPROC, BindFramebuffer) X(PFNGLFRAMEBUFFERTEXTURE2DPROC, FramebufferTexture2D)                                                                                              \
                                                                        X(PFNGLCHECKFRAMEBUFFERSTATUSPROC, CheckFramebufferStatus) X(PFNGLDELETEFRAMEBUFFERSPROC, DeleteFramebuffers) X(PFNGLDRAWBUFFERSPROC, DrawBuffers)                                                                                        \
                                                                            X(PFNGLGENRENDERBUFFERSPROC, GenRenderbuffers) X(PFNGLBINDRENDERBUFFERPROC, BindRenderbuffer) X(PFNGLRENDERBUFFERSTORAGEPROC, RenderbufferStorage)                                                                                    \
                                                                                X(PFNGLFRAMEBUFFERRENDERBUFFERPROC, FramebufferRenderbuffer) X(PFNGLDELETERENDERBUFFERSPROC, DeleteRenderbuffers) X(PFNGLREADPIXELSPROC, ReadPixels) X(PFNGLPIXELSTOREIPROC, PixelStorei)

namespace water51 {
struct Gl {
#define WATER51_DECLARE(type, name) type name = nullptr;
    WATER51_GL_FUNCTIONS(WATER51_DECLARE)
#undef WATER51_DECLARE

    Gl() {
#define WATER51_LOAD(type, name)                                      \
    name = reinterpret_cast<type>(SDL_GL_GetProcAddress("gl" #name)); \
    if (name == nullptr)                                              \
        throw std::runtime_error("Missing OpenGL function: gl" #name);
        WATER51_GL_FUNCTIONS(WATER51_LOAD)
#undef WATER51_LOAD
    }

    void check(const char* operation) const {
        const GLenum error = GetError();
        if (error != GL_NO_ERROR)
            throw std::runtime_error(std::string(operation) + "; OpenGL error=" + std::to_string(error));
    }
};
} // namespace water51

#undef WATER51_GL_FUNCTIONS
