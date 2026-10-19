
"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";

const languages = [
  [1, "Português 1"],
  [2, "Português 2"],
  [3, "Português 3"],
  [4, "Português 4"],
  [5, "Português 5"],
];

const emptyTemplate = {
  email_title1: "",
  email_title2: "",
  email_title3: "",
  email_title4: "",
  email_title5: "",
  email_body1: "",
  email_body2: "",
  email_body3: "",
  email_body4: "",
  email_body5: "",
};

const emptySettings = {
  reply_email: "",
  reply_password: "",
  sending_server: "",
  sending_port: "587",
};

const emptyChatbotSettings = {
  propertyID: "",
  active: true,
  provider: "Hijiffy",
  hijiffyToken: "",
  hijiffyCampaign: "",
  whatsappToken: "",
  whatsappPhoneID: "",
  preCheckinEnabled: false,
  checkinEnabled: false,
  checkinDelay: "0",
  preCheckoutEnabled: false,
  preCheckoutDelay: "0",
  checkoutEnabled: false,
  checkoutDelay: "0",
};

export default function AdvancedConfigurationsPage() {
  const [settings, setSettings] = useState(emptySettings);
  const [templates, setTemplates] = useState([]);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [chatbotSettings, setChatbotSettings] = useState(emptyChatbotSettings);
  const [editingId, setEditingId] = useState(null);
  const [activeLanguage, setActiveLanguage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingChatbotSettings, setSavingChatbotSettings] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsResponse, templatesResponse, chatbotResponse] = await Promise.all([
          fetch("/api/emailSettings"),
          fetch("/api/emailTemplates"),
          fetch("/api/chatbotsStay"),
        ]);

        const settingsData = await settingsResponse.json();
        const templatesData = await templatesResponse.json();
        const chatbotData = await chatbotResponse.json();

        if (settingsData) {
          setSettings({
            reply_email: settingsData.reply_email || "",
            // Nunca esperamos receber a password/hash da API.
            reply_password: "",
            sending_server: settingsData.sending_server || "",
            sending_port: String(settingsData.sending_port || "587"),
          });
        }

        setTemplates(Array.isArray(templatesData) ? templatesData : []);

        if (chatbotData) {
          setChatbotSettings({
            ...emptyChatbotSettings,
            ...chatbotData,
            propertyID: String(chatbotData.propertyID || ""),
            checkinDelay: String(chatbotData.checkinDelay || 0),
            preCheckinDelay: String(chatbotData.preCheckinDelay || 0),
            preCheckoutDelay: String(chatbotData.preCheckoutDelay || 0),
            checkoutDelay: String(chatbotData.checkoutDelay || 0),
          });
        }
      } catch (error) {
        setMessageType("error");
        setMessage("Não foi possível carregar as configurações.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function updateSettings(event) {
    const { name, value } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateTemplate(event) {
    const { name, value } = event.target;

    setTemplateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateChatbotSettings(event) {
    const { name, value, type, checked } = event.target;

    setChatbotSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();

    setSavingSettings(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/emailSettings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível guardar a configuração.");
      }

      setSettings((current) => ({
        ...current,
        reply_email: data.reply_email || current.reply_email,
        sending_server: data.sending_server || current.sending_server,
        sending_port: String(
          data.sending_port || current.sending_port || "587"
        ),
        // Não colocar password/hash no estado vindo da API.
        reply_password: "",
      }));

      setMessageType("success");
      setMessage("Configuração de email guardada com sucesso.");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message || "Não foi possível guardar a configuração."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveTemplate(event) {
    event.preventDefault();

    setSavingTemplate(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        editingId
          ? `/api/emailTemplates/${editingId}`
          : "/api/emailTemplates",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templateForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setTemplates((current) =>
        editingId
          ? current.map((template) =>
              template.email_template_id === editingId
                ? data
                : template
            )
          : [...current, data]
      );

      resetTemplateForm();

      setMessageType("success");
      setMessage("Modelo de email guardado.");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message || "Não foi possível guardar o modelo."
      );
    } finally {
      setSavingTemplate(false);
    }
  }

  async function saveChatbotSettings(event) {
    event.preventDefault();

    setSavingChatbotSettings(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/chatbotsStay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatbotSettings),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível guardar a configuração dos chatbots.");
      }

      setChatbotSettings((current) => ({
        ...current,
        ...data,
        propertyID: String(data.propertyID),
        checkinDelay: String(data.checkinDelay || 0),
        preCheckinDelay: String(data.preCheckinDelay || 0),
        preCheckoutDelay: String(data.preCheckoutDelay || 0),
        checkoutDelay: String(data.checkoutDelay || 0),
      }));
      setMessageType("success");
      setMessage("Configuração dos chatbots guardada com sucesso.");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message || "Não foi possível guardar a configuração dos chatbots."
      );
    } finally {
      setSavingChatbotSettings(false);
    }
  }

  function editTemplate(template) {
    setEditingId(template.email_template_id);

    setTemplateForm({
      ...emptyTemplate,
      ...Object.fromEntries(
        Object.entries(template).filter(([key]) =>
          key.startsWith("email_")
        )
      ),
    });

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  async function deleteTemplate(id) {
    if (!window.confirm("Eliminar este modelo de email?")) return;

    const response = await fetch(`/api/emailTemplates/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessageType("error");
      setMessage("Não foi possível eliminar o modelo.");
      return;
    }

    setTemplates((current) =>
      current.filter(
        (template) => template.email_template_id !== id
      )
    );

    if (editingId === id) {
      resetTemplateForm();
    }

    setMessageType("success");
    setMessage("Modelo de email eliminado.");
  }

  function resetTemplateForm() {
    setEditingId(null);
    setTemplateForm(emptyTemplate);
    setActiveLanguage(1);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">
          A carregar...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="-mx-6 -mt-6">
        <Topbar title="Configurações avançadas" />
      </div>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm  mb-4 ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Configuração de email"
            description="Defina o servidor utilizado para enviar mensagens da aplicação."
          />

          <form
            onSubmit={saveSettings}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <Field
              label="Email de resposta"
              name="reply_email"
              type="email"
              value={settings.reply_email}
              onChange={updateSettings}
              required
            />

            <Field
              label="Palavra-passe"
              name="reply_password"
              type="password"
              value={settings.reply_password}
              onChange={updateSettings}
              placeholder="Deixe vazio para manter a password atual"
              autoComplete="new-password"
            />
            <Field
              label="Servidor de envio"
              name="sending_server"
              value={settings.sending_server}
              onChange={updateSettings}
              required
            />

            <Field
              label="Porta de envio"
              name="sending_port"
              type="number"
              value={settings.sending_port}
              onChange={updateSettings}
              min="1"
              max="65535"
              required
            />

            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="
                  inline-flex items-center justify-center
                  rounded-xl
                  bg-gradient-to-r from-red-600 to-red-500
                  px-6 py-3
                  text-sm font-semibold text-white
                  shadow-md shadow-red-200
                  transition-all duration-200
                  hover:-translate-y-0.5
                  hover:from-red-700
                  hover:to-red-600
                  hover:shadow-lg hover:shadow-red-200
                  focus:outline-none
                  focus:ring-4 focus:ring-red-100
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  disabled:hover:translate-y-0
                "
              >
                {savingSettings ? (
                  <>
                    A guardar...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                      <path d="M17 21v-8H7v8" />
                      <path d="M7 3v5h8" />
                    </svg>
                    Guardar configuração
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mt-3">
          <SectionTitle
            title="Configuração dos chatbots"
            description="Escolha o provider e configure os dados usados pela aplicação."
          />

          <form
            onSubmit={saveChatbotSettings}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            {/* <Field
              label="Property ID"
              name="propertyID"
              type="number"
              value={chatbotSettings.propertyID}
              onChange={updateChatbotSettings}
              min="1"
              required
            /> */}

            <SelectField
              label="Provider"
              name="provider"
              value={chatbotSettings.provider}
              onChange={updateChatbotSettings}
              options={["Hijiffy", "Whatsapp"]}
            />

            <CheckboxField
              label="Configuração ativa"
              name="active"
              checked={chatbotSettings.active}
              onChange={updateChatbotSettings}
            />

            {chatbotSettings.provider === "Hijiffy" ? (
              <>
                <Field
                  label="Hijiffy token"
                  name="hijiffyToken"
                  value={chatbotSettings.hijiffyToken}
                  onChange={updateChatbotSettings}
                  required
                />
                <Field
                  label="Hijiffy campaign"
                  name="hijiffyCampaign"
                  value={chatbotSettings.hijiffyCampaign}
                  onChange={updateChatbotSettings}
                  required
                />
              </>
            ) : (
              <>
                <Field
                  label="Whatsapp token"
                  name="whatsappToken"
                  value={chatbotSettings.whatsappToken}
                  onChange={updateChatbotSettings}
                  required
                />
                <Field
                  label="Whatsapp phone ID"
                  name="whatsappPhoneID"
                  value={chatbotSettings.whatsappPhoneID}
                  onChange={updateChatbotSettings}
                  required
                />

                <WhatsappToggle
                  label="Pré check-in"
                  enabledName="preCheckinEnabled"
                  delayName="preCheckinDelay"
                  enabled={chatbotSettings.preCheckinEnabled}
                  delay={chatbotSettings.preCheckinDelay}
                  onChange={updateChatbotSettings}
                />
                <WhatsappToggle
                  label="Check-in"
                  enabledName="checkinEnabled"
                  delayName="checkinDelay"
                  enabled={chatbotSettings.checkinEnabled}
                  delay={chatbotSettings.checkinDelay}
                  onChange={updateChatbotSettings}
                />
                <WhatsappToggle
                  label="Pré check-out"
                  enabledName="preCheckoutEnabled"
                  delayName="preCheckoutDelay"
                  enabled={chatbotSettings.preCheckoutEnabled}
                  delay={chatbotSettings.preCheckoutDelay}
                  onChange={updateChatbotSettings}
                />
                <WhatsappToggle
                  label="Check-out"
                  enabledName="checkoutEnabled"
                  delayName="checkoutDelay"
                  enabled={chatbotSettings.checkoutEnabled}
                  delay={chatbotSettings.checkoutDelay}
                  onChange={updateChatbotSettings}
                />
              </>
            )}

            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingChatbotSettings}
                className="flex rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-red-200 transition hover:-translate-y-0.5 hover:from-red-700 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                      <path d="M17 21v-8H7v8" />
                      <path d="M7 3v5h8" />
                    </svg>
                {savingChatbotSettings ? "A guardar..." : "Guardar configuração"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  ...props
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
      {label}

      <input
        name={name}
        type={type}
        value={value || ""}
        onChange={onChange}
        className="
          rounded-xl
          border border-gray-300
          bg-white
          px-3 py-2.5
          font-normal text-gray-900
          outline-none
          transition
          placeholder:text-gray-400
          focus:border-red-400
          focus:ring-4 focus:ring-red-50
        "
        {...props}
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-normal text-gray-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 self-end pb-2 text-sm font-medium text-gray-700">
      <input
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-red-600"
      />
      {label}
    </label>
  );
}

function WhatsappToggle({
  label,
  enabledName,
  delayName,
  enabled,
  delay,
  onChange,
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_140px] sm:items-end">
      <CheckboxField
        label={`${label} ativo`}
        name={enabledName}
        checked={enabled}
        onChange={onChange}
      />
      <Field
        label="Delay (minutos)"
        name={delayName}
        type="number"
        value={delay}
        onChange={onChange}
        min="0"
        required
      />
    </div>
  );
}
