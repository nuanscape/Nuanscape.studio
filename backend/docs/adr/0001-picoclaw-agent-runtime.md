# ADR 0001: PicoClaw sebagai sidecar agent read-only

## Status
Accepted (arsitektur, 2026-11-13); verifikasi provider live pending.

## Context
Nuanscape membutuhkan head agent dan sub-agent untuk analisis Finance, Seller,
dan Content. PicoClaw mendukung multi-agent dan spawn, tetapi bukan layanan
multi-tenant dan tidak punya API task/JSON native.

## Decision
PicoClaw dipakai sebagai sidecar analisis read-only setelah spike lulus.
Backend tetap menjadi orchestrator, pemilik data, approval, dan audit.
Agent tidak boleh menulis data atau mengeksekusi aksi bisnis.

Provider model: **kie.ai** sebagai primary (`kie-gemini` → `gemini-3.1-pro`) dan
**NVIDIA NIM** sebagai fallback lintas provider
(`nvidia-llama` → `nvidia/nvidia/nemotron-3.5-lightning-30b-a3b`; prefix
pertama di-strip PicoClaw). `gpt-5-2` tidak dipakai sebagai default karena
tidak memanggil tool pada endpoint KIE.
Kredensial hanya disimpan di `.security.yml` yang di-ignore; `config.json`
tidak memuat key.

## Consequences
- Runtime default `picoclaw`; mode deterministic tetap tersedia sebagai fallback tanpa LLM.
- Gate: 4 agent terdaftar dan findings valid; verifikasi fallback live menunggu key NVIDIA NIM yang valid.
- Satu worker PicoClaw melayani satu workspace; run diserialisasi.
- Output CLI diparse dengan sentinel dan divalidasi Zod.
- Jika spike gagal, integrasi ditolak dan ADR diubah menjadi Rejected.
