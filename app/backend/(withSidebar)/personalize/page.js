"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function PersonalizePage() {
  const [form, setForm] = useState({
    page_model: 1,
    primary_color: "#ef4444",
    secondary_color: "#000000",
    background_color: "#ffffff",
    foreground_color: "#000000",
    card_colors: [],
    background_image: "",
    logo: "",
    bar_text: "", 
    bar_text_details: "",
    icon_color: "#000000",
    card_text_font: "Arial",
    card_text_color: "#000000",
    card_text_size: "16",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---------------- FETCH ----------------

  async function fetchData() {
    const res = await fetch("/api/personalize");
    const data = await res.json();

    if (data) {
      setForm({
        page_model: Number(data.page_model ?? 1),
        primary_color: data.primary_color || "#ef4444",
        secondary_color: data.secondary_color || "#000000",
        background_color: data.background_color || "#ffffff",
        foreground_color: data.foreground_color || "#000000",
        card_colors: data.card_colors || [],
        background_image: data.background_image || "",
        logo: data.logo || "",
        bar_text: data.bar_text || "",
        bar_text_details: data.bar_text_details || "",
        icon_color: data.icon_color || "#000000",
        card_text_font: data.card_text_font || "Arial",
        card_text_color: data.card_text_color || "#000000",
        card_text_size: data.card_text_size || "16",
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------- HANDLERS ----------------

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "page_model" ? Number(value) : value,
    }));
  }

  function handleCardColorChange(index, value) {
    const updated = [...form.card_colors];
    updated[index] = value;
    setForm({ ...form, card_colors: updated });
  }

  function addCardColor() {
    setForm({
      ...form,
      card_colors: [...form.card_colors, "#ffffff"],
    });
  }

  function removeCardColor(index) {
    const updated = form.card_colors.filter((_, i) => i !== index);
    setForm({ ...form, card_colors: updated });
  }

  function removeImage(field) {
    setForm((prev) => ({
      ...prev,
      [field]: "",
    }));
  }

  async function uploadImage(file, field) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.url) {
      setForm((prev) => ({
        ...prev,
        [field]: data.url,
      }));
    }
  }

  // ---------------- SAVE ----------------

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    let payload = {
      ...form,
      page_model: Number(form.page_model),
    };

    if (payload.page_model === 1) {
      payload.card_colors = [];
    }

    if (payload.page_model === 2) {
      payload.background_image = null;
    }

    await fetch("/api/personalize", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setSaving(false);
    alert("Guardado com sucesso!");
  }

  if (loading) {
    return <div className="p-6">A carregar...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
      <Topbar title="Personalização" />
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl shadow flex flex-col gap-6"
        >

          {/* PAGE MODEL */}
          <Section title="Layout">
            <select
              name="page_model"
              value={String(form.page_model)}
              onChange={handleChange}
              className="input"
            >
              <option value="1">Lista</option>
              <option value="2">Galeria</option>
            </select>
          </Section>

          {/* COLORS */}
          <Section title="Cores">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["primary_color", "Primária"],
                ["secondary_color", "Secundária"],
                ["background_color", "Background"],
                ["foreground_color", "Texto"],
                ["icon_color", "Ícones"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>

                  <input
                    type="color"
                    name={key}
                    value={form[key] || "#000000"}
                    onChange={handleChange}
                    className="color-input"
                  />
                </div>
              ))}
            </div>
          </Section>
          <Section title="Barra de navegação">
            <div className="grid grid-cols-2 gap-4">
              <div>
             <label className="label">Texto da Barra</label>
              <input
                type="text"
                name="bar_text"
                value={form.bar_text}
                onChange={handleChange}
                placeholder="Nome do hotel ou mensagem personalizada"
                className="input"
                />
              </div>
              <div>
                <label className="label">Detalhes da barra</label>
                <input
                  type="text"
                  name="bar_text_details"
                  value={form.bar_text_details}
                  onChange={handleChange}
                  placeholder="Nome do hotel ou mensagem personalizada"
                  className="input"
                  />
              </div>
            </div>
            </Section>

<Section title="Detalhes da Barra">
</Section>

          {/* GALLERY TEXT SETTINGS */}
          {form.page_model === 2 && (
            <Section title="Texto dos Cards">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="label">Fonte do Texto</label>
                  <select
                    name="card_text_font"
                    value={form.card_text_font}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Lucida Grande">Lucida Grande</option>
                    <option value="Trebuchet MS">Trebuchet MS</option>
                    <option value="Palatino Linotype">Palatino Linotype</option>
                    <option value="Garamond">Garamond</option>
                    <option value="Brush Script MT, cursive">Brush Script MT</option>
                    <option value="Lucida Handwriting, cursive">Lucida Handwriting</option>
                    <option value="Segoe Script, cursive">Segoe Script</option>
                    <option value="Segoe Print, cursive">Segoe Print</option>
                    <option value="Freestyle Script, cursive">Freestyle Script</option>
                    <option value="Bradley Hand, cursive">Bradley Hand</option>
                    <option value="Kristen ITC, cursive">Kristen ITC</option>
                    <option value="Great Vibes, cursive">Great Vibes</option>
                    <option value="Pacifico, cursive">Pacifico</option>
                    <option value="Dancing Script, cursive">Dancing Script</option>
                    <option value="Impact, sans-serif">Impact</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                    <option value="Segoe UI">Segoe UI</option>
                    <option value="Oswald, sans-serif">Oswald</option>
                    <option value="Lobster, cursive">Lobster</option>
                    <option value="Montserrat, sans-serif">Montserrat</option>
                    <option value="Poppins, sans-serif">Poppins</option>
                    <option value="Playfair Display, serif">Playfair Display</option>
                    <option value="Raleway, sans-serif">Raleway</option>
                    <option value="Merriweather, serif">Merriweather</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="label">Cor do Texto</label>
                  <input
                    type="color"
                    name="card_text_color"
                    value={form.card_text_color || "#000000"}
                    onChange={handleChange}
                    className="color-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="label">Tamanho do Texto</label>
                  <input
                    type="number"
                    name="card_text_size"
                    value={form.card_text_size}
                    onChange={handleChange}
                    min="10"
                    max="70"
                    className="input"
                  />
                </div>
              </div>
            </Section>
          )}

          {/* CARD COLORS */}
          {form.page_model === 2 && (
            <Section title="Cores dos Cards">
              <div className="flex flex-wrap gap-3">
                {form.card_colors.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) =>
                        handleCardColorChange(i, e.target.value)
                      }
                      className="color-small"
                    />

                    <button
                      type="button"
                      onClick={() => removeCardColor(i)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      remover
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addCardColor}
                className="btn-secondary mt-3"
              >
                + Adicionar cor
              </button>
            </Section>
          )}

          {/* BACKGROUND */}
          {form.page_model === 1 && (
            <Section title="Imagem de Fundo">
              <ImageUpload
                value={form.background_image}
                onUpload={(file) =>
                  uploadImage(file, "background_image")
                }
                onRemove={() => removeImage("background_image")}
              />
            </Section>
          )}

          {/* LOGO */}
          <Section title="Logo">
            <ImageUpload
              value={form.logo}
              onUpload={(file) => uploadImage(file, "logo")}
              onRemove={() => removeImage("logo")}
            />
          </Section>

          {/* SAVE */}
          <button
            disabled={saving}
            className="btn-primary"
            style={{ background: form.primary_color }}
          >
            {saving ? "A guardar..." : "Guardar alterações"}
          </button>

        </form>
      </div>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4">
      <h2 className="text-sm font-semibold text-gray-600">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ImageUpload({ value, onUpload, onRemove }) {
  return (
    <div className="flex flex-col gap-4">

      <label
        className="
          border-2 border-dashed border-gray-300
          rounded-2xl
          p-6
          cursor-pointer
          hover:border-red-400
          hover:bg-red-50
          transition
          flex flex-col items-center justify-center
          text-center
        "
      >
        <div className="text-4xl mb-2">🖼️</div>

        <span className="font-medium text-gray-700">
          Clique para selecionar uma imagem
        </span>

        <span className="text-sm text-gray-500 mt-1">
          PNG, JPG, JPEG ou WEBP
        </span>

        <span className="text-xs text-gray-400 mt-2">
          Tamanho máximo: 850 KB
        </span>

        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (!file) return;

            if (file.size > 850 * 1024) {
              alert(
                "A imagem não pode exceder 850 KB."
              );
              return;
            }

            onUpload(file);
          }}
        />
      </label>

      {value && (
        <div
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            bg-gray-50
            w-fit
          "
        >
          <img
            src={value}
            alt="Preview"
            className="
              max-h-48
              min-w-[250px]
              object-cover
            "
          />

          <button
            type="button"
            onClick={onRemove}
            className="
              absolute top-3 right-3
              h-8 w-8
              rounded-full
              bg-red-600
              text-white
              shadow-lg
              hover:bg-red-700
              transition
              flex items-center justify-center
            "
          >
            ✕
          </button>

          <div
            className="
              absolute bottom-0 left-0 right-0
              bg-black/50
              text-white
              text-xs
              px-3 py-2
            "
          >
            Imagem carregada
          </div>
        </div>
      )}

    </div>
  );
}