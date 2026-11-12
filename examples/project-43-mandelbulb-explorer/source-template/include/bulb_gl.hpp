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

namespace bulb {

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

    template <typename Function>
    void load(Function& address, const char* name) {
        address = reinterpret_cast<Function>(SDL_GL_GetProcAddress(name));
        if (!address)
            throw std::runtime_error(std::string("Missing OpenGL entry point: ") + name);
    }

    void loadAll() {
#define BULB_LOAD(name) load(name, "gl" #name)
        BULB_LOAD(GetString);
        BULB_LOAD(GetError);
        BULB_LOAD(GetIntegerv);
        BULB_LOAD(ClearColor);
        BULB_LOAD(Clear);
        BULB_LOAD(Viewport);
        BULB_LOAD(Enable);
        BULB_LOAD(Disable);
        BULB_LOAD(PolygonMode);
        BULB_LOAD(PolygonOffset);
        BULB_LOAD(CreateShader);
        BULB_LOAD(ShaderSource);
        BULB_LOAD(CompileShader);
        BULB_LOAD(GetShaderiv);
        BULB_LOAD(GetShaderInfoLog);
        BULB_LOAD(DeleteShader);
        BULB_LOAD(CreateProgram);
        BULB_LOAD(AttachShader);
        BULB_LOAD(LinkProgram);
        BULB_LOAD(GetProgramiv);
        BULB_LOAD(GetProgramInfoLog);
        BULB_LOAD(DeleteProgram);
        BULB_LOAD(UseProgram);
        BULB_LOAD(GetUniformLocation);
        BULB_LOAD(UniformMatrix4fv);
        BULB_LOAD(Uniform3f);
        BULB_LOAD(Uniform1i);
        BULB_LOAD(GenBuffers);
        BULB_LOAD(BindBuffer);
        BULB_LOAD(BufferData);
        BULB_LOAD(DeleteBuffers);
        BULB_LOAD(GetBufferParameteriv);
        BULB_LOAD(GenVertexArrays);
        BULB_LOAD(BindVertexArray);
        BULB_LOAD(DeleteVertexArrays);
        BULB_LOAD(VertexAttribPointer);
        BULB_LOAD(EnableVertexAttribArray);
        BULB_LOAD(DrawElements);
        BULB_LOAD(DrawArrays);
        BULB_LOAD(ReadPixels);
        BULB_LOAD(PixelStorei);
        BULB_LOAD(GetInteger64v);
        BULB_LOAD(GetIntegeri_v);
        BULB_LOAD(Uniform1f);
        BULB_LOAD(Uniform2i);
        BULB_LOAD(Uniform2f);
        BULB_LOAD(ClearBufferData);
        BULB_LOAD(Uniform1ui);
        BULB_LOAD(BufferSubData);
        BULB_LOAD(BindBufferBase);
        BULB_LOAD(GetBufferSubData);
        BULB_LOAD(GetBufferParameteri64v);
        BULB_LOAD(DispatchCompute);
        BULB_LOAD(MemoryBarrier);
        BULB_LOAD(GenQueries);
        BULB_LOAD(DeleteQueries);
        BULB_LOAD(BeginQuery);
        BULB_LOAD(EndQuery);
        BULB_LOAD(GetQueryObjectiv);
        BULB_LOAD(GetQueryObjectui64v);
        BULB_LOAD(FenceSync);
        BULB_LOAD(ClientWaitSync);
        BULB_LOAD(DeleteSync);
        BULB_LOAD(Flush);
        BULB_LOAD(BlendFunc);
#undef BULB_LOAD
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

} // namespace bulb
