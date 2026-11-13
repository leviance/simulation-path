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

namespace sculpt {

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
    PFNGLUNIFORM2IPROC Uniform2i{};
    PFNGLUNIFORM2FPROC Uniform2f{};
    PFNGLCLEARBUFFERDATAPROC ClearBufferData{};
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
    PFNGLCOPYBUFFERSUBDATAPROC CopyBufferSubData{};

    template <typename Function>
    void load(Function& address, const char* name) {
        address = reinterpret_cast<Function>(SDL_GL_GetProcAddress(name));
        if (!address)
            throw std::runtime_error(std::string("Missing OpenGL entry point: ") + name);
    }

    void loadAll() {
#define SCULPT_LOAD(name) load(name, "gl" #name)
        SCULPT_LOAD(GetString);
        SCULPT_LOAD(GetError);
        SCULPT_LOAD(GetIntegerv);
        SCULPT_LOAD(ClearColor);
        SCULPT_LOAD(Clear);
        SCULPT_LOAD(Viewport);
        SCULPT_LOAD(Enable);
        SCULPT_LOAD(Disable);
        SCULPT_LOAD(PolygonMode);
        SCULPT_LOAD(PolygonOffset);
        SCULPT_LOAD(CreateShader);
        SCULPT_LOAD(ShaderSource);
        SCULPT_LOAD(CompileShader);
        SCULPT_LOAD(GetShaderiv);
        SCULPT_LOAD(GetShaderInfoLog);
        SCULPT_LOAD(DeleteShader);
        SCULPT_LOAD(CreateProgram);
        SCULPT_LOAD(AttachShader);
        SCULPT_LOAD(LinkProgram);
        SCULPT_LOAD(GetProgramiv);
        SCULPT_LOAD(GetProgramInfoLog);
        SCULPT_LOAD(DeleteProgram);
        SCULPT_LOAD(UseProgram);
        SCULPT_LOAD(GetUniformLocation);
        SCULPT_LOAD(UniformMatrix4fv);
        SCULPT_LOAD(Uniform3f);
        SCULPT_LOAD(Uniform1i);
        SCULPT_LOAD(GenBuffers);
        SCULPT_LOAD(BindBuffer);
        SCULPT_LOAD(BufferData);
        SCULPT_LOAD(DeleteBuffers);
        SCULPT_LOAD(GetBufferParameteriv);
        SCULPT_LOAD(GenVertexArrays);
        SCULPT_LOAD(BindVertexArray);
        SCULPT_LOAD(DeleteVertexArrays);
        SCULPT_LOAD(VertexAttribPointer);
        SCULPT_LOAD(EnableVertexAttribArray);
        SCULPT_LOAD(DrawElements);
        SCULPT_LOAD(DrawArrays);
        SCULPT_LOAD(ReadPixels);
        SCULPT_LOAD(PixelStorei);
        SCULPT_LOAD(GetInteger64v);
        SCULPT_LOAD(GetIntegeri_v);
        SCULPT_LOAD(Uniform1f);
        SCULPT_LOAD(Uniform2i);
        SCULPT_LOAD(Uniform2f);
        SCULPT_LOAD(ClearBufferData);
        SCULPT_LOAD(Uniform1ui);
        SCULPT_LOAD(BufferSubData);
        SCULPT_LOAD(BindBufferBase);
        SCULPT_LOAD(GetBufferSubData);
        SCULPT_LOAD(GetBufferParameteri64v);
        SCULPT_LOAD(DispatchCompute);
        SCULPT_LOAD(MemoryBarrier);
        SCULPT_LOAD(GenQueries);
        SCULPT_LOAD(DeleteQueries);
        SCULPT_LOAD(BeginQuery);
        SCULPT_LOAD(EndQuery);
        SCULPT_LOAD(GetQueryObjectiv);
        SCULPT_LOAD(GetQueryObjectui64v);
        SCULPT_LOAD(FenceSync);
        SCULPT_LOAD(ClientWaitSync);
        SCULPT_LOAD(DeleteSync);
        SCULPT_LOAD(Flush);
        SCULPT_LOAD(BlendFunc);
        SCULPT_LOAD(CopyBufferSubData);
#undef SCULPT_LOAD
    }
};

inline std::filesystem::path pathFromUtf8(std::string_view text) {
    const std::u8string encoded(text.begin(), text.end());
    return std::filesystem::path(encoded);
}

inline std::string readShader(const char* name) {
    std::filesystem::path path = std::filesystem::path(COURSE_SHADER_DIRECTORY) / name;
    if (!std::filesystem::is_regular_file(path)) {
        const char* base = SDL_GetBasePath();
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
    Shader(GlApi& gl, GLenum type, const char* filename)
        : gl_(gl) {
        const std::string source = readShader(filename);
        id_ = gl_.CreateShader(type);
        if (!id_)
            throw std::runtime_error("Could not allocate shader");
        const char* pointer = source.c_str();
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

    Shader(const Shader&) = delete;
    Shader& operator=(const Shader&) = delete;

    GLuint id() const {
        return id_;
    }

    private:
    GlApi& gl_;
    GLuint id_{};
};

class Program {
    public:
    Program(GlApi& gl, const char* computeName)
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

    Program(GlApi& gl, const char* vertexName, const char* fragmentName)
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

    Program(const Program&) = delete;
    Program& operator=(const Program&) = delete;

    void use() const {
        gl_.UseProgram(id_);
    }

    GLint optionalUniform(const char* name) const {
        return gl_.GetUniformLocation(id_, name);
    }

    GLint uniform(const char* name) const {
        const GLint location = gl_.GetUniformLocation(id_, name);
        if (location < 0)
            throw std::runtime_error(std::string("Missing shader uniform: ") + name);
        return location;
    }

    private:
    GlApi& gl_;
    GLuint id_{};
};

} // namespace sculpt
