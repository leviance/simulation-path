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

namespace geometry {

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

    template <typename Function>
    void load(Function& address, const char* name) {
        address = reinterpret_cast<Function>(SDL_GL_GetProcAddress(name));
        if (!address)
            throw std::runtime_error(std::string("Missing OpenGL entry point: ") + name);
    }

    void loadAll() {
#define GEOMETRY_LOAD(name) load(name, "gl" #name)
        GEOMETRY_LOAD(GetString);
        GEOMETRY_LOAD(GetError);
        GEOMETRY_LOAD(GetIntegerv);
        GEOMETRY_LOAD(ClearColor);
        GEOMETRY_LOAD(Clear);
        GEOMETRY_LOAD(Viewport);
        GEOMETRY_LOAD(Enable);
        GEOMETRY_LOAD(Disable);
        GEOMETRY_LOAD(PolygonMode);
        GEOMETRY_LOAD(PolygonOffset);
        GEOMETRY_LOAD(CreateShader);
        GEOMETRY_LOAD(ShaderSource);
        GEOMETRY_LOAD(CompileShader);
        GEOMETRY_LOAD(GetShaderiv);
        GEOMETRY_LOAD(GetShaderInfoLog);
        GEOMETRY_LOAD(DeleteShader);
        GEOMETRY_LOAD(CreateProgram);
        GEOMETRY_LOAD(AttachShader);
        GEOMETRY_LOAD(LinkProgram);
        GEOMETRY_LOAD(GetProgramiv);
        GEOMETRY_LOAD(GetProgramInfoLog);
        GEOMETRY_LOAD(DeleteProgram);
        GEOMETRY_LOAD(UseProgram);
        GEOMETRY_LOAD(GetUniformLocation);
        GEOMETRY_LOAD(UniformMatrix4fv);
        GEOMETRY_LOAD(Uniform3f);
        GEOMETRY_LOAD(Uniform1i);
        GEOMETRY_LOAD(GenBuffers);
        GEOMETRY_LOAD(BindBuffer);
        GEOMETRY_LOAD(BufferData);
        GEOMETRY_LOAD(DeleteBuffers);
        GEOMETRY_LOAD(GetBufferParameteriv);
        GEOMETRY_LOAD(GenVertexArrays);
        GEOMETRY_LOAD(BindVertexArray);
        GEOMETRY_LOAD(DeleteVertexArrays);
        GEOMETRY_LOAD(VertexAttribPointer);
        GEOMETRY_LOAD(EnableVertexAttribArray);
        GEOMETRY_LOAD(DrawElements);
        GEOMETRY_LOAD(DrawArrays);
        GEOMETRY_LOAD(ReadPixels);
        GEOMETRY_LOAD(PixelStorei);
#undef GEOMETRY_LOAD
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

} // namespace geometry
