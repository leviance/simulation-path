#pragma once

#include "sculpt_camera.hpp"
#include "sculpt_gpu_mesh.hpp"
#include "sculpt_overlay.hpp"

namespace sculpt {

class MeshRenderer {
    public:
    explicit MeshRenderer(GlApi& gl)
        : gl_(gl), program_(gl,"sculpt_mesh.vert","sculpt_mesh.frag") {
        gl_.GenVertexArrays(1, &vao_);
        if (!vao_)
            throw std::runtime_error("Could not allocate mesh VAO");
    }

    ~MeshRenderer() {
        gl_.DeleteVertexArrays(1, &vao_);
    }

    void draw(const std::vector<MeshChunk>& chunks, const Camera& camera, int x, int y, int width, int height, bool wireframe, bool normalView) {
        gl_.Viewport(x, y, width, height);
        gl_.Enable(GL_DEPTH_TEST);
        gl_.Disable(GL_CULL_FACE);
        gl_.PolygonMode(GL_FRONT_AND_BACK, GL_FILL);
        if (wireframe)
            gl_.PolygonMode(GL_FRONT_AND_BACK, GL_LINE);
        program_.use();
        vector("cameraEye",camera.eye());
        vector("cameraRight",camera.right());
        vector("cameraUp",camera.up());
        vector("cameraForward",camera.forward());
        gl_.Uniform1f(program_.uniform("tanHalfFov"),camera.tanHalfFov);
        gl_.Uniform1f(program_.uniform("aspect"),static_cast<float>(width)/height);
        gl_.Uniform1i(program_.uniform("normalView"),static_cast<int>(normalView));
        gl_.BindVertexArray(vao_);
        for (const auto& chunk : chunks) {
            if (!chunk.buffer || chunk.stats.vertices == 0)
                continue;
            gl_.BindBuffer(GL_ARRAY_BUFFER,chunk.buffer->id());
            gl_.VertexAttribPointer(0,3,GL_FLOAT,GL_FALSE,sizeof(SurfaceVertex),nullptr);
            gl_.VertexAttribPointer(1,3,GL_FLOAT,GL_FALSE,sizeof(SurfaceVertex),reinterpret_cast<void*>(16));
            gl_.EnableVertexAttribArray(0);
            gl_.EnableVertexAttribArray(1);
            gl_.DrawArrays(GL_TRIANGLES,0,static_cast<GLsizei>(chunk.stats.vertices));
        }
        gl_.PolygonMode(GL_FRONT_AND_BACK, GL_FILL);
    }

    private:
    void vector(const char* name, Vec3 value) {
        gl_.Uniform3f(program_.uniform(name),value.x,value.y,value.z);
    }

    GlApi& gl_;
    Program program_;
    GLuint vao_{};
};

class OverlayRenderer {
    public:
    explicit OverlayRenderer(GlApi& gl)
        : gl_(gl), program_(gl,"overlay.vert","overlay.frag") {
        gl_.GenVertexArrays(1,&vao_);
        gl_.GenBuffers(1,&buffer_);
        if (!vao_ || !buffer_)
            throw std::runtime_error("Could not allocate supplied UI scaffold");
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER,buffer_);
        gl_.VertexAttribPointer(0,3,GL_FLOAT,GL_FALSE,sizeof(LineVertex),nullptr);
        gl_.VertexAttribPointer(1,3,GL_FLOAT,GL_FALSE,sizeof(LineVertex),reinterpret_cast<void*>(12));
        gl_.EnableVertexAttribArray(0);
        gl_.EnableVertexAttribArray(1);
    }

    ~OverlayRenderer() {
        gl_.DeleteBuffers(1,&buffer_);
        gl_.DeleteVertexArrays(1,&vao_);
    }

    void draw(const Overlay& overlay,int width,int height) {
        if (overlay.vertices().size() > 250000)
            throw std::runtime_error("UI scaffold exceeded its bounded geometry budget");
        gl_.Viewport(0,0,width,height);
        gl_.Disable(GL_DEPTH_TEST);
        program_.use();
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER,buffer_);
        gl_.BufferData(GL_ARRAY_BUFFER,overlay.vertices().size()*sizeof(LineVertex),overlay.vertices().data(),GL_DYNAMIC_DRAW);
        gl_.DrawArrays(GL_TRIANGLES,0,static_cast<GLsizei>(overlay.vertices().size()));
    }

    private:
    GlApi& gl_;
    Program program_;
    GLuint vao_{},buffer_{};
};

} // namespace sculpt
