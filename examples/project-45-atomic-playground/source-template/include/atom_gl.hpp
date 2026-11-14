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

namespace atom {

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
    PFNGLUNIFORM4FPROC Uniform4f{};
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
    PFNGLGETQUERYIVPROC GetQueryiv{};
    PFNGLGETQUERYOBJECTIVPROC GetQueryObjectiv{};
    PFNGLGETQUERYOBJECTUI64VPROC GetQueryObjectui64v{};
    PFNGLFENCESYNCPROC FenceSync{};
    PFNGLCLIENTWAITSYNCPROC ClientWaitSync{};
    PFNGLDELETESYNCPROC DeleteSync{};
    PFNGLFLUSHPROC Flush{};
    PFNGLBLENDFUNCPROC BlendFunc{};
    PFNGLCOPYBUFFERSUBDATAPROC CopyBufferSubData{};
    PFNGLDEPTHMASKPROC DepthMask{};
    PFNGLGENFRAMEBUFFERSPROC GenFramebuffers{};
    PFNGLDELETEFRAMEBUFFERSPROC DeleteFramebuffers{};
    PFNGLBINDFRAMEBUFFERPROC BindFramebuffer{};
    PFNGLFRAMEBUFFERTEXTURE2DPROC FramebufferTexture2D{};
    PFNGLCHECKFRAMEBUFFERSTATUSPROC CheckFramebufferStatus{};
    PFNGLGENTEXTURESPROC GenTextures{};
    PFNGLDELETETEXTURESPROC DeleteTextures{};
    PFNGLBINDTEXTUREPROC BindTexture{};
    PFNGLTEXIMAGE2DPROC TexImage2D{};
    PFNGLTEXPARAMETERIPROC TexParameteri{};
    PFNGLACTIVETEXTUREPROC ActiveTexture{};

    template <typename Function>
    void load(Function& address, const char* name) {
        address = reinterpret_cast<Function>(SDL_GL_GetProcAddress(name));
        if (!address)
            throw std::runtime_error(std::string("Missing OpenGL entry point: ") + name);
    }

    void loadAll() {
#define ATOM_LOAD(name) load(name, "gl" #name)
        ATOM_LOAD(GetString);
        ATOM_LOAD(GetError);
        ATOM_LOAD(GetIntegerv);
        ATOM_LOAD(ClearColor);
        ATOM_LOAD(Clear);
        ATOM_LOAD(Viewport);
        ATOM_LOAD(Enable);
        ATOM_LOAD(Disable);
        ATOM_LOAD(PolygonMode);
        ATOM_LOAD(PolygonOffset);
        ATOM_LOAD(CreateShader);
        ATOM_LOAD(ShaderSource);
        ATOM_LOAD(CompileShader);
        ATOM_LOAD(GetShaderiv);
        ATOM_LOAD(GetShaderInfoLog);
        ATOM_LOAD(DeleteShader);
        ATOM_LOAD(CreateProgram);
        ATOM_LOAD(AttachShader);
        ATOM_LOAD(LinkProgram);
        ATOM_LOAD(GetProgramiv);
        ATOM_LOAD(GetProgramInfoLog);
        ATOM_LOAD(DeleteProgram);
        ATOM_LOAD(UseProgram);
        ATOM_LOAD(GetUniformLocation);
        ATOM_LOAD(UniformMatrix4fv);
        ATOM_LOAD(Uniform3f);
        ATOM_LOAD(Uniform4f);
        ATOM_LOAD(Uniform1i);
        ATOM_LOAD(GenBuffers);
        ATOM_LOAD(BindBuffer);
        ATOM_LOAD(BufferData);
        ATOM_LOAD(DeleteBuffers);
        ATOM_LOAD(GetBufferParameteriv);
        ATOM_LOAD(GenVertexArrays);
        ATOM_LOAD(BindVertexArray);
        ATOM_LOAD(DeleteVertexArrays);
        ATOM_LOAD(VertexAttribPointer);
        ATOM_LOAD(EnableVertexAttribArray);
        ATOM_LOAD(DrawElements);
        ATOM_LOAD(DrawArrays);
        ATOM_LOAD(ReadPixels);
        ATOM_LOAD(PixelStorei);
        ATOM_LOAD(GetInteger64v);
        ATOM_LOAD(GetIntegeri_v);
        ATOM_LOAD(Uniform1f);
        ATOM_LOAD(Uniform2i);
        ATOM_LOAD(Uniform2f);
        ATOM_LOAD(ClearBufferData);
        ATOM_LOAD(Uniform1ui);
        ATOM_LOAD(BufferSubData);
        ATOM_LOAD(BindBufferBase);
        ATOM_LOAD(GetBufferSubData);
        ATOM_LOAD(GetBufferParameteri64v);
        ATOM_LOAD(DispatchCompute);
        ATOM_LOAD(MemoryBarrier);
        ATOM_LOAD(GenQueries);
        ATOM_LOAD(DeleteQueries);
        ATOM_LOAD(BeginQuery);
        ATOM_LOAD(EndQuery);
        ATOM_LOAD(GetQueryiv);
        ATOM_LOAD(GetQueryObjectiv);
        ATOM_LOAD(GetQueryObjectui64v);
        ATOM_LOAD(FenceSync);
        ATOM_LOAD(ClientWaitSync);
        ATOM_LOAD(DeleteSync);
        ATOM_LOAD(Flush);
        ATOM_LOAD(BlendFunc);
        ATOM_LOAD(CopyBufferSubData);
        ATOM_LOAD(DepthMask);
        ATOM_LOAD(GenFramebuffers);
        ATOM_LOAD(DeleteFramebuffers);
        ATOM_LOAD(BindFramebuffer);
        ATOM_LOAD(FramebufferTexture2D);
        ATOM_LOAD(CheckFramebufferStatus);
        ATOM_LOAD(GenTextures);
        ATOM_LOAD(DeleteTextures);
        ATOM_LOAD(BindTexture);
        ATOM_LOAD(TexImage2D);
        ATOM_LOAD(TexParameteri);
        ATOM_LOAD(ActiveTexture);
#undef ATOM_LOAD
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
    // Only this supplied catalog include is allowed; no arbitrary include paths.
    const std::string marker = "#include \"density.glsl\"";
    const auto include = source.find(marker);
    if (include != std::string::npos) {
        if (std::string_view(name) == "density.glsl")
            throw std::runtime_error("Recursive shader include is forbidden");
        const auto density = readShader("density.glsl");
        source.replace(include, marker.size(), density);
        if (source.find("#include") != std::string::npos)
            throw std::runtime_error("Only one supplied density include is supported");
    }
    return source;
}

class Shader {
    public:
    Shader(GlApi& gl, GLenum type, const char* filename) :
        gl_(gl) {
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
    Program(GlApi& gl, const char* computeName) :
        gl_(gl) {
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

    Program(GlApi& gl, const char* vertexName, const char* fragmentName) :
        gl_(gl) {
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

} // namespace atom
