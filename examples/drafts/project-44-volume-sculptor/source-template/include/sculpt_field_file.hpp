#pragma once

#include "sculpt_limits.hpp"
#include <bit>
#include <istream>
#include <ostream>
#include <span>
#include <vector>

namespace sculpt {

static_assert(sizeof(float) == 4 && std::numeric_limits<float>::is_iec559);

inline constexpr std::size_t fieldHeaderSize = 64;
inline constexpr std::array<std::byte, 8> fieldMagic{
    std::byte{'S'}, std::byte{'C'}, std::byte{'L'}, std::byte{'P'},
    std::byte{'T'}, std::byte{'4'}, std::byte{'4'}, std::byte{0}};

// snippet:sculpt-file-store-unsigned
inline void storeUnsigned(std::span<std::byte> bytes, std::size_t offset, std::uint64_t value, std::size_t width) {
    if (width > 8 || offset > bytes.size() || width > bytes.size() - offset)
        throw std::invalid_argument("Binary integer write is outside the bounded header");
    for (std::size_t index = 0; index < width; ++index)
        bytes[offset + index] = static_cast<std::byte>((value >> (index * 8)) & 255);
}
// end-snippet:sculpt-file-store-unsigned

inline std::uint64_t loadUnsigned(std::span<const std::byte> bytes, std::size_t offset, std::size_t width) {
    if (width > 8 || offset > bytes.size() || width > bytes.size() - offset)
        throw std::invalid_argument("Binary integer read is outside the bounded header");
    std::uint64_t result = 0;
    for (std::size_t index = 0; index < width; ++index)
        result |= static_cast<std::uint64_t>(std::to_integer<unsigned>(bytes[offset + index])) << (index * 8);
    return result;
}

inline void storeFloat(std::span<std::byte> bytes, std::size_t offset, float value) {
    storeUnsigned(bytes, offset, std::bit_cast<std::uint32_t>(value), 4);
}

inline float loadFloat(std::span<const std::byte> bytes, std::size_t offset) {
    return std::bit_cast<float>(static_cast<std::uint32_t>(loadUnsigned(bytes, offset, 4)));
}

struct FieldHeader {
    ModelSettings settings;
    std::uint64_t checksum{};
};

// snippet:sculpt-file-encode-header
inline std::array<std::byte, fieldHeaderSize> encodeFieldHeader(const FieldHeader& header) {
    header.settings.validate();
    std::array<std::byte, fieldHeaderSize> bytes{};
    std::copy(fieldMagic.begin(), fieldMagic.end(), bytes.begin());
    storeUnsigned(bytes, 8, 1, 4);
    storeUnsigned(bytes, 12, static_cast<unsigned>(header.settings.grid.samples), 4);
    storeFloat(bytes, 16, header.settings.grid.origin.x);
    storeFloat(bytes, 20, header.settings.grid.origin.y);
    storeFloat(bytes, 24, header.settings.grid.origin.z);
    storeFloat(bytes, 28, header.settings.grid.extent);
    storeFloat(bytes, 32, header.settings.isovalue);
    storeUnsigned(bytes, 36, static_cast<unsigned>(header.settings.shape), 4);
    storeUnsigned(bytes, 40, header.settings.grid.sampleCount(), 8);
    storeUnsigned(bytes, 48, header.checksum, 8);
    // Bytes 56..63 are reserved and must remain zero in version 1.
    return bytes;
}
// end-snippet:sculpt-file-encode-header

// snippet:sculpt-file-decode-header
inline FieldHeader decodeFieldHeader(std::span<const std::byte> bytes) {
    if (bytes.size() != fieldHeaderSize || !std::equal(fieldMagic.begin(), fieldMagic.end(), bytes.begin()))
        throw std::invalid_argument("Not a complete SCLPT44 scalar-field header");
    if (loadUnsigned(bytes, 8, 4) != 1 || loadUnsigned(bytes, 56, 8) != 0)
        throw std::invalid_argument("Unsupported field version or nonzero reserved header bytes");
    const auto samples = loadUnsigned(bytes, 12, 4);
    if (samples > 192)
        throw std::invalid_argument("Field grid exceeds the bounded resolution presets");
    FieldHeader result;
    result.settings.grid.samples = static_cast<int>(samples);
    result.settings.grid.origin = {loadFloat(bytes, 16), loadFloat(bytes, 20), loadFloat(bytes, 24)};
    result.settings.grid.extent = loadFloat(bytes, 28);
    result.settings.isovalue = loadFloat(bytes, 32);
    const auto shape = loadUnsigned(bytes, 36, 4);
    if (shape > 2)
        throw std::invalid_argument("Field archive has an unknown reset preset");
    result.settings.shape = static_cast<Shape>(shape);
    result.settings.validate();
    if (loadUnsigned(bytes, 40, 8) != result.settings.grid.sampleCount())
        throw std::invalid_argument("Field payload count does not match N cubed");
    result.checksum = loadUnsigned(bytes, 48, 8);
    return result;
}
// end-snippet:sculpt-file-decode-header

// snippet:sculpt-file-checksum
class FieldChecksum {
    public:
    explicit FieldChecksum(std::span<const std::byte> header) {
        if (header.size() != fieldHeaderSize)
            throw std::invalid_argument("Checksum requires the complete field header");
        update(header.first(48));
        update(header.subspan(56, 8));
    }

    void update(std::span<const std::byte> bytes) {
        for (const auto byte : bytes) {
            value_ ^= std::to_integer<unsigned>(byte);
            value_ *= 1099511628211ULL;
        }
    }

    std::uint64_t value() const {
        return value_;
    }

    private:
    std::uint64_t value_{14695981039346656037ULL};
};
// end-snippet:sculpt-file-checksum

inline std::vector<std::byte> encodeFieldSamples(std::span<const float> values) {
    if (values.size() > 65536)
        throw std::invalid_argument("Field IO is limited to 65536 samples per batch");
    std::vector<std::byte> bytes(values.size() * sizeof(float));
    for (std::size_t index = 0; index < values.size(); ++index) {
        if (!std::isfinite(values[index]) || std::abs(values[index]) > 32)
            throw std::invalid_argument("Field archive contains a nonfinite or out-of-range scalar sample");
        storeFloat(bytes, index * 4, values[index]);
    }
    return bytes;
}

inline std::vector<float> decodeFieldSamples(std::span<const std::byte> bytes) {
    if (bytes.size() % 4 != 0 || bytes.size() / 4 > 65536)
        throw std::invalid_argument("Field payload is not a bounded batch of 32-bit scalars");
    std::vector<float> result(bytes.size() / 4);
    for (std::size_t index = 0; index < result.size(); ++index) {
        result[index] = loadFloat(bytes, index * 4);
        if (!std::isfinite(result[index]) || std::abs(result[index]) > 32)
            throw std::invalid_argument("Field archive contains a nonfinite or out-of-range scalar sample");
    }
    return result;
}

class FieldWriter {
    public:
    FieldWriter(std::ostream& stream, ModelSettings settings)
        : stream_(stream), header_{settings, 0}, bytes_(encodeFieldHeader(header_)), checksum_(bytes_) {
        if (stream_.tellp() != 0)
            throw std::invalid_argument("A field writer needs a new seekable file at offset zero");
        stream_.write(reinterpret_cast<const char*>(bytes_.data()), bytes_.size());
        checkStream();
    }

    void append(std::span<const float> values) {
        if (finished_ || values.empty() || values.size() > header_.settings.grid.sampleCount() - written_)
            throw std::invalid_argument("Field write exceeds its exact declared sample count");
        const auto bytes = encodeFieldSamples(values);
        stream_.write(reinterpret_cast<const char*>(bytes.data()), static_cast<std::streamsize>(bytes.size()));
        checkStream();
        checksum_.update(bytes);
        written_ += values.size();
    }

    // snippet:sculpt-file-finish-write
    void finish() {
        if (finished_ || written_ != header_.settings.grid.sampleCount())
            throw std::logic_error("An incomplete field cannot become a completed archive");
        std::array<std::byte, 8> checksumBytes{};
        storeUnsigned(checksumBytes, 0, checksum_.value(), 8);
        stream_.seekp(48);
        stream_.write(reinterpret_cast<const char*>(checksumBytes.data()), checksumBytes.size());
        stream_.seekp(0, std::ios::end);
        stream_.flush();
        checkStream();
        finished_ = true;
    }
    // end-snippet:sculpt-file-finish-write

    std::size_t written() const {
        return written_;
    }

    std::uint64_t checksum() const {
        return checksum_.value();
    }

    private:
    void checkStream() const {
        if (!stream_)
            throw std::runtime_error("Field file write/seek failed; the partial file was not published");
    }

    std::ostream& stream_;
    FieldHeader header_;
    std::array<std::byte, fieldHeaderSize> bytes_;
    FieldChecksum checksum_;
    std::size_t written_{};
    bool finished_{};
};

class FieldReader {
    public:
    explicit FieldReader(std::istream& stream)
        : stream_(stream), bytes_(readHeader(stream)), header_(decodeFieldHeader(bytes_)), checksum_(bytes_) {}

    const FieldHeader& header() const {
        return header_;
    }

    std::size_t readCount() const {
        return read_;
    }

    // snippet:sculpt-file-read-batches
    std::vector<float> next(std::size_t maximumSamples = 65536) {
        if (finished_ || maximumSamples == 0 || maximumSamples > 65536 || read_ == header_.settings.grid.sampleCount())
            throw std::logic_error("Field read has no remaining bounded batch");
        const auto count = std::min(maximumSamples, header_.settings.grid.sampleCount() - read_);
        std::vector<std::byte> bytes(count * 4);
        stream_.read(reinterpret_cast<char*>(bytes.data()), static_cast<std::streamsize>(bytes.size()));
        if (!stream_)
            throw std::invalid_argument("Truncated scalar field payload");
        auto result = decodeFieldSamples(bytes);
        checksum_.update(bytes);
        read_ += count;
        return result;
    }

    void finish() {
        if (finished_ || read_ != header_.settings.grid.sampleCount() || checksum_.value() != header_.checksum)
            throw std::invalid_argument("Incomplete field or checksum mismatch; keep the previous document");
        if (stream_.peek() != std::char_traits<char>::eof() || stream_.bad())
            throw std::invalid_argument("Field archive has trailing bytes or a read error");
        finished_ = true;
    }
    // end-snippet:sculpt-file-read-batches

    private:
    static std::array<std::byte, fieldHeaderSize> readHeader(std::istream& stream) {
        std::array<std::byte, fieldHeaderSize> bytes{};
        stream.read(reinterpret_cast<char*>(bytes.data()), bytes.size());
        if (!stream)
            throw std::invalid_argument("Truncated scalar field header");
        return bytes;
    }

    std::istream& stream_;
    std::array<std::byte, fieldHeaderSize> bytes_;
    FieldHeader header_;
    FieldChecksum checksum_;
    std::size_t read_{};
    bool finished_{};
};

} // namespace sculpt
