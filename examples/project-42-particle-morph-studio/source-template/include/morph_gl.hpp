#pragma once

#include <SDL3/SDL.h>
#define SDL_OPENGL_1_FUNCTION_TYPEDEFS
#include <SDL3/SDL_opengl.h>

#include <array>
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <string>
#include <string_view>

namespace morph {

// SDL owns the context. This supplied table only loads the entry points the viewer calls.
struct GlApi {
    PFNGLGETSTRINGPROC GetString{};
    PFNGLGETERRORPROC GetError{};
    PFNGLGETINTEGERVPROC GetIntegerv{};
    PFNGLCLEARCOLORPROC ClearColor{};
    PFNGLCLEARPROC Clear{};
    PFNGLVIEWPORTPROC Viewport{};
    PFNGLENABLEPROC Enable{};
    PFNGLDISABLEPROC Disable{};
    PFNGLPOLYGONMODEPROC PolygonMode{};
    PFNGLPOLYGONOFFSETPROC PolygonOffset{};
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
    PFNGLUNIFORM3FPROC Uniform3f{};
    PFNGLUNIFORM1IPROC Uniform1i{};
    PFNGLGENBUFFERSPROC GenBuffers{};
    PFNGLBINDBUFFERPROC BindBuffer{};
    PFNGLBUFFERDATAPROC BufferData{};
    PFNGLDELETEBUFFERSPROC DeleteBuffers{};
    PFNGLGETBUFFERPARAMETERIVPROC GetBufferParameteriv{};
    PFNGLGENVERTEXARRAYSPROC GenVertexArrays{};
    PFNGLBINDVERTEXARRAYPROC BindVertexArray{};
    PFNGLDELETEVERTEXARRAYSPROC DeleteVertexArrays{};
    PFNGLVERTEXATTRIBPOINTERPROC VertexAttribPointer{};
    PFNGLENABLEVERTEXATTRIBARRAYPROC EnableVertexAttribArray{};
    PFNGLDRAWELEMENTSPROC DrawElements{};
    PFNGLDRAWARRAYSPROC DrawArrays{};
    PFNGLREADPIXELSPROC ReadPixels{};
    PFNGLPIXELSTOREIPROC PixelStorei{};
    PFNGLGETINTEGER64VPROC GetInteger64v{};
    PFNGLGETINTEGERI_VPROC GetIntegeri_v{};
    PFNGLUNIFORM1FPROC Uniform1f{};
    PFNGLUNIFORM1UIPROC Uniform1ui{};
    PFNGLBUFFERSUBDATAPROC BufferSubData{};
    PFNGLBINDBUFFERBASEPROC BindBufferBase{};
    PFNGLGETBUFFERSUBDATAPROC GetBufferSubData{};
    PFNGLGETBUFFERPARAMETERI64VPROC GetBufferParameteri64v{};
    PFNGLDISPATCHCOMPUTEPROC DispatchCompute{};
    PFNGLMEMORYBARRIERPROC MemoryBarrier{};
    PFNGLGENQUERIESPROC GenQueries{};
    PFNGLDELETEQUERIESPROC DeleteQueries{};
    PFNGLBEGINQUERYPROC BeginQuery{};
    PFNGLENDQUERYPROC EndQuery{};
    PFNGLGETQUERYOBJECTIVPROC GetQueryObjectiv{};
    PFNGLGETQUERYOBJECTUI64VPROC GetQueryObjectui64v{};
    PFNGLFENCESYNCPROC FenceSync{};
    PFNGLCLIENTWAITSYNCPROC ClientWaitSync{};
    PFNGLDELETESYNCPROC DeleteSync{};
    PFNGLFLUSHPROC Flush{};
    PFNGLBLENDFUNCPROC BlendFunc{};

    template <typename Function>
    void load(Function &address, const char *name) {
        address = reinterpret_cast<Function>(SDL_GL_GetProcAddress(name));
        if (!address)
            throw std::runtime_error(std::string("Missing OpenGL entry point: ") + name);
    }

    void loadAll() {
#define MORPH_LOAD(name) load(name, "gl" #name)
        MORPH_LOAD(GetString);
        MORPH_LOAD(GetError);
        MORPH_LOAD(GetIntegerv);
        MORPH_LOAD(ClearColor);
        MORPH_LOAD(Clear);
        MORPH_LOAD(Viewport);
        MORPH_LOAD(Enable);
        MORPH_LOAD(Disable);
        MORPH_LOAD(PolygonMode);
        MORPH_LOAD(PolygonOffset);
        MORPH_LOAD(CreateShader);
        MORPH_LOAD(ShaderSource);
        MORPH_LOAD(CompileShader);
        MORPH_LOAD(GetShaderiv);
        MORPH_LOAD(GetShaderInfoLog);
        MORPH_LOAD(DeleteShader);
        MORPH_LOAD(CreateProgram);
        MORPH_LOAD(AttachShader);
        MORPH_LOAD(LinkProgram);
        MORPH_LOAD(GetProgramiv);
        MORPH_LOAD(GetProgramInfoLog);
        MORPH_LOAD(DeleteProgram);
        MORPH_LOAD(UseProgram);
        MORPH_LOAD(GetUniformLocation);
        MORPH_LOAD(UniformMatrix4fv);
        MORPH_LOAD(Uniform3f);
        MORPH_LOAD(Uniform1i);
        MORPH_LOAD(GenBuffers);
        MORPH_LOAD(BindBuffer);
        MORPH_LOAD(BufferData);
        MORPH_LOAD(DeleteBuffers);
        MORPH_LOAD(GetBufferParameteriv);
        MORPH_LOAD(GenVertexArrays);
        MORPH_LOAD(BindVertexArray);
        MORPH_LOAD(DeleteVertexArrays);
        MORPH_LOAD(VertexAttribPointer);
        MORPH_LOAD(EnableVertexAttribArray);
        MORPH_LOAD(DrawElements);
        MORPH_LOAD(DrawArrays);
        MORPH_LOAD(ReadPixels);
        MORPH_LOAD(PixelStorei);
        MORPH_LOAD(GetInteger64v);
        MORPH_LOAD(GetIntegeri_v);
        MORPH_LOAD(Uniform1f);
        MORPH_LOAD(Uniform1ui);
        MORPH_LOAD(BufferSubData);
        MORPH_LOAD(BindBufferBase);
        MORPH_LOAD(GetBufferSubData);
        MORPH_LOAD(GetBufferParameteri64v);
        MORPH_LOAD(DispatchCompute);
        MORPH_LOAD(MemoryBarrier);
        MORPH_LOAD(GenQueries);
        MORPH_LOAD(DeleteQueries);
        MORPH_LOAD(BeginQuery);
        MORPH_LOAD(EndQuery);
        MORPH_LOAD(GetQueryObjectiv);
        MORPH_LOAD(GetQueryObjectui64v);
        MORPH_LOAD(FenceSync);
        MORPH_LOAD(ClientWaitSync);
        MORPH_LOAD(DeleteSync);
        MORPH_LOAD(Flush);
        MORPH_LOAD(BlendFunc);
#undef MORPH_LOAD
    }
};

inline std::filesystem::path pathFromUtf8(std::string_view text) {
    const std::u8string encoded(text.begin(), text.end());
    return std::filesystem::path(encoded);
}

inline std::string readShader(const char *name) {
    std::filesystem::path path = std::filesystem::path(COURSE_SHADER_DIRECTORY) / name;
    if (!std::filesystem::is_regular_file(path)) {
        const char *base = SDL_GetBasePath();
        if (!base)
            throw std::runtime_error(SDL_GetError());
        path = pathFromUtf8(base) / COURSE_SHADER_FALLBACK_SUBDIRECTORY / name;
    }
    std::ifstream input(path, std::ios::binary | std::ios::ate);
    if (!input)
        throw std::runtime_error(std::string("Could not open shader: ") + name);
    const auto size = input.tellg();
    if (size <= 0 || size > 65536)
        throw std::runtime_error("Shader source exceeds the workshop limit");
    std::string source(static_cast<std::size_t>(size), '\0');
    input.seekg(0);
    input.read(source.data(), static_cast<std::streamsize>(source.size()));
    if (!input)
        throw std::runtime_error("Could not read shader source");
    return source;
}

class Shader {
    public:
    Shader(GlApi &gl, GLenum type, const char *filename)
        : gl_(gl) {
        const std::string source = readShader(filename);
        id_ = gl_.CreateShader(type);
        if (!id_)
            throw std::runtime_error("Could not allocate shader");
        const char *pointer = source.c_str();
        gl_.ShaderSource(id_, 1, &pointer, nullptr);
        gl_.CompileShader(id_);
        GLint compiled{};
        gl_.GetShaderiv(id_, GL_COMPILE_STATUS, &compiled);
        if (compiled == GL_TRUE)
            return;

        std::array<GLchar, 2048> log{};
        gl_.GetShaderInfoLog(id_, static_cast<GLsizei>(log.size()), nullptr, log.data());
        gl_.DeleteShader(id_);
        throw std::runtime_error(std::string(filename) + ": " + log.data());
    }

    ~Shader() {
        gl_.DeleteShader(id_);
    }

    Shader(const Shader &) = delete;
    Shader &operator=(const Shader &) = delete;

    GLuint id() const {
        return id_;
    }

    private:
    GlApi &gl_;
    GLuint id_{};
};

class Program {
    public:
    Program(GlApi &gl, const char *computeName)
        : gl_(gl) {
        const Shader compute(gl, GL_COMPUTE_SHADER, computeName);
        id_ = gl_.CreateProgram();
        if (!id_)
            throw std::runtime_error("Could not allocate compute program");
        gl_.AttachShader(id_, compute.id());
        gl_.LinkProgram(id_);
        GLint linked{};
        gl_.GetProgramiv(id_, GL_LINK_STATUS, &linked);
        if (linked != GL_TRUE) {
            std::array<GLchar, 2048> log{};
            gl_.GetProgramInfoLog(id_, static_cast<GLsizei>(log.size()), nullptr, log.data());
            gl_.DeleteProgram(id_);
            throw std::runtime_error(std::string("Compute link failed: ") + log.data());
        }
    }
    Program(GlApi &gl, const char *vertexName, const char *fragmentName)
        : gl_(gl) {
        const Shader vertex(gl, GL_VERTEX_SHADER, vertexName);
        const Shader fragment(gl, GL_FRAGMENT_SHADER, fragmentName);
        id_ = gl_.CreateProgram();
        if (!id_)
            throw std::runtime_error("Could not allocate shader program");
        gl_.AttachShader(id_, vertex.id());
        gl_.AttachShader(id_, fragment.id());
        gl_.LinkProgram(id_);
        GLint linked{};
        gl_.GetProgramiv(id_, GL_LINK_STATUS, &linked);
        if (linked == GL_TRUE)
            return;

        std::array<GLchar, 2048> log{};
        gl_.GetProgramInfoLog(id_, static_cast<GLsizei>(log.size()), nullptr, log.data());
        gl_.DeleteProgram(id_);
        throw std::runtime_error(std::string("Program link failed: ") + log.data());
    }

    ~Program() {
        gl_.DeleteProgram(id_);
    }

    Program(const Program &) = delete;
    Program &operator=(const Program &) = delete;

    void use() const {
        gl_.UseProgram(id_);
    }

    GLint uniform(const char *name) const {
        const GLint location = gl_.GetUniformLocation(id_, name);
        if (location < 0)
            throw std::runtime_error(std::string("Missing shader uniform: ") + name);
        return location;
    }

    private:
    GlApi &gl_;
    GLuint id_{};
};

} // namespace morph
