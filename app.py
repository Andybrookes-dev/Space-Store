import gradio as gr
from PIL import Image
import torch

from transformers import (
    BlipProcessor,
    BlipForConditionalGeneration,
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
)
from sentence_transformers import SentenceTransformer

device = "cpu"

# BLIP
blip_processor = BlipProcessor.from_pretrained(
    "Salesforce/blip-image-captioning-base",
    use_safetensors=True,
)
blip_model = BlipForConditionalGeneration.from_pretrained(
    "Salesforce/blip-image-captioning-base",
    use_safetensors=True,
    low_cpu_mem_usage=True,
    torch_dtype="auto",
)
blip_model.to(device)

# Embeddings
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# T5 reasoning
t5_tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-small")
t5_model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-small")
t5_model.to(device)


def analyse(image):
    pil_image = Image.fromarray(image)

    # BLIP captioning
    blip_inputs = blip_processor(
        pil_image,
        text="describe the clothing item in detail",
        return_tensors="pt"
    ).to(device)

    with torch.no_grad():
        blip_out = blip_model.generate(
            **blip_inputs,
            max_new_tokens=60,
            num_beams=5,
            repetition_penalty=1.1
        )

    caption = blip_processor.decode(blip_out[0], skip_special_tokens=True)

    # Embedding
    clip_emb = embedder.encode([caption]).tolist()

    # T5 reasoning
    prompt = (
        f"Image description: {caption}. "
        "Extract: category, colours, style, and tags. "
        "Respond in JSON."
    )

    t5_inputs = t5_tokenizer(prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        t5_out = t5_model.generate(**t5_inputs, max_new_tokens=150)

    reasoning = t5_tokenizer.decode(t5_out[0], skip_special_tokens=True)

    return {
        "caption": caption,
        "clip_embedding": clip_emb,
        "analysis": reasoning,
    }


iface = gr.Interface(
    fn=analyse,
    inputs=gr.Image(type="numpy"),
    outputs="json",
    title="Galactic Threads Image Analysis API",
)

iface.launch(ssr_mode=False)

