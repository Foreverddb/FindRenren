# Third-Party Notices

## Transformers.js

- Package: `@huggingface/transformers` 4.2.0
- Source: https://github.com/huggingface/transformers.js
- License: Apache License 2.0

## BEN2

- Model: `onnx-community/BEN2-ONNX`
- Source: https://huggingface.co/onnx-community/BEN2-ONNX
- Upstream: https://github.com/PramaLLC/BEN2
- Paper: https://arxiv.org/abs/2501.06230
- License: MIT License
- Included weight: `onnx/model_fp16.onnx` (FP16, 219,121,675 bytes)

## MODNet

- Model: `Xenova/modnet`
- Source: https://huggingface.co/Xenova/modnet
- Upstream: https://github.com/ZHKKKe/MODNet
- License: Apache License 2.0
- Included weight: `onnx/model_quantized.onnx` (q8, 6,632,188 bytes)

The application silently preloads both included models from `/models/` and performs all portrait matting locally in the browser. MODNet provides the 256 x 256 low-quality option; BEN2 provides the 1024 x 1024 high-quality option.
