"use client";

import { useEffect, useState } from "react";
import Editor from "@/components/editor/page.js";
import Topbar from "@/components/layout/Topbar";
import { QRCodeCanvas } from "qrcode.react";
import { IoQrCode } from "react-icons/io5";

function getScheduleName(schedule) {
  let data = schedule.schedule_json;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  return data?.name || `Horário ${schedule.schedule_id}`;
}

export default function OutletsPage() {
  const [outlets, setOutlets] = useState([]);
  const [areas, setAreas] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [accessPointOptions, setAccessPointOptions] = useState([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [accessRooms, setAccessRooms] = useState([]);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [accessPointId, setAccessPointId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState(null);

  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [editorContent, setEditorContent] = useState(null);
  const [qrOutlet, setQrOutlet] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrAccessPoints, setQrAccessPoints] = useState([]);
  const [qrAccessPointId, setQrAccessPointId] = useState("");
  const [isLoadingQrAccessPoints, setIsLoadingQrAccessPoints] = useState(false);

  const [form, setForm] = useState({
    outlet_name1: "",
    outlet_name2: "",
    outlet_name3: "",
    outlet_name4: "",
    outlet_name5: "",
    area_id: "",
    schedule_id: "",
    schedule_visible: false,
    associate_schedule: false,
    access_points: false,
    reservation: false,
    service_reservation: false,
    takeaway_order: false,
    order: false,
    instant_order: false,
  });

  // ---------------- IMAGE STATE ----------------

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  // ---------------- FETCH ----------------

  async function fetchData() {
    const [
      outletsResponse,
      areasResponse,
      languagesResponse,
      schedulesResponse,
      accessPointsResponse,
    ] = await Promise.all([
      fetch("/api/outlets"),
      fetch("/api/areas"),
      fetch("/api/languages"),
      fetch("/api/schedules"),
      fetch("/api/accessPoints"),
    ]);

    if (
      !outletsResponse.ok ||
      !areasResponse.ok ||
      !languagesResponse.ok ||
      !schedulesResponse.ok ||
      !accessPointsResponse.ok
    ) {
      throw new Error("Não foi possível carregar os dados dos outlets.");
    }

    const [outlets, areas, langs, schedules, accessPoints] = await Promise.all([
      outletsResponse.json(),
      areasResponse.json(),
      languagesResponse.json(),
      schedulesResponse.json(),
      accessPointsResponse.json(),
    ]);

    const normalizedLangs = langs
      .sort((a, b) => (a.lang_order ?? 999) - (b.lang_order ?? 999))
      .map((l, i) => ({
        ...l,
        safe_order: l.lang_order ?? i + 1,
      }));

    setOutlets(outlets);
    setAreas(areas);
    setLanguages(normalizedLangs);
    setSchedules(schedules);
    setAccessPointOptions(accessPoints);
  }

  useEffect(() => {
    fetchData().catch((error) => {
      console.error(error);
      alert(error.message);
    });
  }, []);

  // ---------------- CREATE ----------------

  function openCreate() {
    setEditingId(null);

    setForm({
      outlet_name1: "",
      outlet_name2: "",
      outlet_name3: "",
      outlet_name4: "",
      outlet_name5: "",
      area_id: "",
      schedule_id: "",
      schedule_visible: false,
      associate_schedule: false,
      access_points: false,
      reservation: false,
      service_reservation: false,
      takeaway_order: false,
      order: false,
      instant_order: false,
    });

    setActiveTab("general");
    setAccessRooms([{ id: null, name: "Sala 1", points: [] }]);
    setSelectedRoomIndex(0);
    setIsEditingRoomName(false);
    setAccessPointId("");
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);

    setShowModal(true);
  }

  // ---------------- EDIT ----------------

  async function openEdit(outlet) {
    setEditingId(outlet.outlet_id);

    setForm({
      outlet_name1: outlet.outlet_name1 || "",
      outlet_name2: outlet.outlet_name2 || "",
      outlet_name3: outlet.outlet_name3 || "",
      outlet_name4: outlet.outlet_name4 || "",
      outlet_name5: outlet.outlet_name5 || "",
      area_id: outlet.area_id || "",
      schedule_id: outlet.schedule_id ? String(outlet.schedule_id) : "",
      schedule_visible: outlet.schedule_visible ?? false,
      associate_schedule: outlet.associate_schedule ?? false,
      access_points: outlet.access_points ?? false,
      reservation: outlet.reservation === 1 || outlet.reservation === "1",
      service_reservation: outlet.service_reservation ?? false,
      takeaway_order: outlet.takeaway_order ?? false,
      order: outlet.order === 1 || outlet.order === "1",
      instant_order: outlet.instant_order ?? false,
    });

    setActiveTab("general");
    setAccessRooms([{ id: null, name: "Sala 1", points: [] }]);
    setSelectedRoomIndex(0);
    setIsEditingRoomName(false);
    setAccessPointId("");
    setImageFile(null);

    setImagePreview(outlet.outlet_image || null);

    setExistingImage(outlet.outlet_image || null);

    setShowModal(true);

    try {
      const response = await fetch(`/api/outlets/${outlet.outlet_id}/access-points`);
      if (!response.ok) {
        throw new Error("Não foi possível carregar os pontos de acesso.");
      }

      const data = await response.json();
      setAccessRooms(
        data.rooms?.length
          ? data.rooms.map((room) => ({
              id: room.group.access_point_group_id,
              name: room.group.access_point_group_name || "Sala",
              points: room.points.map((point) => ({
                id: point.access_point_id,
                name: point.access_point_name || `Ponto ${point.access_point_id}`,
              })),
            }))
          : [{ id: null, name: "Sala 1", points: [] }]
      );
      setSelectedRoomIndex(0);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  // ---------------- FORM ----------------

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleSettingChange(e) {
    const { name, checked } = e.target;

    setForm((currentForm) => {
      const requiresAccessPoints =
        currentForm.reservation ||
        currentForm.service_reservation ||
        currentForm.order ||
        currentForm.instant_order;

      if (name === "access_points" && !checked && requiresAccessPoints) {
        return currentForm;
      }

      const nextForm = {
        ...currentForm,
        [name]: checked,
      };

      if (checked) {
        if (name === "reservation") {
          nextForm.service_reservation = false;
          nextForm.instant_order = false;
        } else if (name === "service_reservation") {
          nextForm.reservation = false;
          nextForm.instant_order = false;
          nextForm.takeaway_order = false;
        } else if (name === "instant_order") {
          nextForm.reservation = false;
          nextForm.service_reservation = false;
          nextForm.takeaway_order = false;
          nextForm.order = false;
        } else if (name === "takeaway_order" || name === "order") {
          nextForm.instant_order = false;
          if (name === "takeaway_order") {
            nextForm.service_reservation = false;
          }
        }

        if (
          name === "reservation" ||
          name === "service_reservation" ||
          name === "order" ||
          name === "instant_order"
        ) {
          nextForm.access_points = true;
        }
      }

      return nextForm;
    });

    if (name === "reservation" && !checked) {
      setActiveTab("general");
    }

    const accessPointsRequired =
      form.reservation ||
      form.service_reservation ||
      form.order ||
      form.instant_order;
    if (name === "access_points" && !checked && !accessPointsRequired) {
      setActiveTab("general");
    }
  }

  function addAccessPoint() {
    if (!accessPointId) return;

    const accessPoint = accessPointOptions.find(
      (point) => String(point.access_point_id) === accessPointId
    );
    if (!accessPoint) return;

    setAccessRooms((currentRooms) =>
      currentRooms.map((room, index) =>
        index === selectedRoomIndex
          ? {
              ...room,
              points: [
                ...room.points,
                {
                  id: accessPoint.access_point_id,
                  name:
                    accessPoint.access_point_name ||
                    `Ponto ${accessPoint.access_point_id}`,
                },
              ],
            }
          : room
      )
    );
    setAccessPointId("");
  }

  function addSpatialArea() {
    const nextIndex = accessRooms.length + 1;
    setAccessRooms((currentRooms) => [
      ...currentRooms,
      { id: null, name: `Sala ${nextIndex}`, points: [] },
    ]);
    setSelectedRoomIndex(accessRooms.length);
    setIsEditingRoomName(false);
    setAccessPointId("");
  }

  function updateSelectedRoom(updater) {
    setAccessRooms((currentRooms) =>
      currentRooms.map((room, index) =>
        index === selectedRoomIndex ? updater(room) : room
      )
    );
  }

  // ---------------- IMAGE UPLOAD ----------------

  async function uploadImage(file) {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();

    return data.url;
  }

  // ---------------- CRUD ----------------

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.reservation && form.service_reservation) {
      alert("A reserva de mesa e a reserva de serviços não podem estar ativas ao mesmo tempo.");
      setActiveTab("general");
      return;
    }

    if (form.service_reservation && form.takeaway_order) {
      alert("A reserva de serviços e as encomendas não podem estar ativas ao mesmo tempo.");
      setActiveTab("general");
      return;
    }

    if (
      form.instant_order &&
      (form.reservation ||
        form.service_reservation ||
        form.takeaway_order ||
        form.order)
    ) {
      alert("Os pedidos instantâneos não podem estar ativos com reservas, encomendas ou pedidos no outlet.");
      setActiveTab("general");
      return;
    }

    if (!form.area_id) {
      alert("Selecionar área");
      setActiveTab("general");
      return;
    }

    if ((form.reservation || form.associate_schedule) && !form.schedule_id) {
      alert(
        form.reservation
          ? "Selecione um horário para a reserva de mesa."
          : "Selecione um horário associado ao outlet."
      );
      setActiveTab(form.reservation ? "tableReservation" : "general");
      return;
    }

    const requiresAccessPoints =
      form.reservation ||
      form.service_reservation ||
      form.order ||
      form.instant_order;
    const hasAssociatedAccessPoints = accessRooms.some(
      (room) => room.points.length > 0
    );

    if (requiresAccessPoints && (!form.access_points || !hasAssociatedAccessPoints)) {
      alert("Selecione pelo menos um ponto de acesso para as opções selecionadas.");
      setActiveTab(form.access_points ? "accessPoints" : "general");
      return;
    }

    setIsSaving(true);

    try {
      let imageUrl = existingImage;

      if (imageFile instanceof File) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload = {
        ...form,
        area_id: Number(form.area_id),
        schedule_id: form.schedule_id ? Number(form.schedule_id) : null,
        reservation: Number(form.reservation),
        order: Number(form.order),
        outlet_card_background: imageUrl,
      };

      let savedOutletId = editingId;

      if (!editingId) {
        const response = await fetch("/api/outlets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || "Não foi possível criar o outlet.");
        }
        const createdOutlet = await response.json();
        savedOutletId = createdOutlet.outlet_id;
      } else {
        const response = await fetch(`/api/outlets/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || "Não foi possível guardar o outlet.");
        }
      }

      const accessPointsResponse = await fetch(
        `/api/outlets/${savedOutletId}/access-points`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rooms: form.access_points ? accessRooms : [],
          }),
        }
      );

      if (!accessPointsResponse.ok) {
        const result = await accessPointsResponse.json().catch(() => null);
        throw new Error(
          result?.error || "Não foi possível guardar os pontos de acesso."
        );
      }

      setShowModal(false);

      setImageFile(null);
      setImagePreview(null);
      setExistingImage(null);

      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao guardar outlet");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(id) {
    try {
      setDeletingId(id);

      const response = await fetch(`/api/outlets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro ao eliminar subcategoria");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleVisible(outlet) {
    try {
      setVisibilityUpdatingId(outlet.outlet_id);

      const response = await fetch(`/api/outlets/${outlet.outlet_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visible: outlet.visible === false }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar estado do outlet.");
      }

      await fetchData();
    } catch (error) {
      console.error(error);
      alert(error.message || "Erro ao atualizar estado do outlet.");
    } finally {
      setVisibilityUpdatingId(null);
    }
  }

  // ---------------- FILTER ----------------

  const filtered = outlets.filter((o) =>
    languages.some((lang) => {
      const field = `outlet_name${lang.safe_order}`;

      return (o[field] || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    })
  );
  const selectedAccessPointIds = new Set(
    accessRooms.flatMap((room) => room.points.map((point) => point.id))
  );
  const availableAccessPoints = accessPointOptions.filter(
    (point) => point.outlet_id == null && !selectedAccessPointIds.has(point.access_point_id)
  );
  const selectedAccessRoom = accessRooms[selectedRoomIndex] || {
    id: null,
    name: `Sala ${selectedRoomIndex + 1}`,
    points: [],
  };

  function getAreaName(id) {
    const cat = areas.find((c) => c.area_id === id);

    return cat?.area_name1 || "—";
  }

  function getTypeLabel(type) {
    if (type === 1) return "Info";
    if (type === 2) return "Reservation";
    if (type === 3) return "Order";

    return "-";
  }

  function buildOutletQrUrl(outlet, accessPointId = "") {
    const params = new URLSearchParams();
    if (outlet.area_id != null) {
      params.set("area_id", outlet.area_id);
    }
    params.set("outlet_id", outlet.outlet_id);
    if (accessPointId) {
      params.set("access_point_id", accessPointId);
    }

    return `${window.location.origin}/homepage?${params.toString()}`;
  }

  async function openOutletQr(outlet) {
    setQrOutlet(outlet);
    setQrAccessPoints([]);
    setQrAccessPointId("");
    setQrUrl(buildOutletQrUrl(outlet));
    setIsLoadingQrAccessPoints(true);

    try {
      const response = await fetch(
        `/api/outlets/${outlet.outlet_id}/access-points`
      );
      if (!response.ok) {
        throw new Error("Não foi possível carregar os pontos de acesso.");
      }

      const data = await response.json();
      setQrAccessPoints(
        data.points.map((point) => ({
          id: point.access_point_id,
          name: point.access_point_name || `Ponto ${point.access_point_id}`,
          roomName: point.roomName || "Área",
        }))
      );
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsLoadingQrAccessPoints(false);
    }
  }

  function downloadOutletQr() {
    const canvas = document.getElementById("outlet-qr-code");
    if (!(canvas instanceof HTMLCanvasElement)) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    const pointSuffix = qrAccessPointId
      ? `-access-point-${qrAccessPointId}`
      : "";
    link.download = `outlet-${qrOutlet?.outlet_id}${pointSuffix}-qrcode.png`;
    link.click();
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="-mx-6 -mt-6">
        <Topbar title="Outlets" />
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between my-6">

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar outlets..."
          className="h-11 w-80 border border-gray-300 rounded-lg px-3 focus:border-red-500 outline-none bg-white"
        />

        <button
          onClick={openCreate}
          disabled={showModal || isSaving}
          className={`h-11 px-5 rounded-lg ${showModal || isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"}`}
        >
          + Criar Outlet
        </button>

      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-2xl shadow overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 text-left text-gray-600">
            <tr>
              <th className="p-4">ID</th>

              {languages.map((lang) => (
                <th key={lang.lang_id} className="p-4">
                  {lang.lang_name}
                </th>
              ))}

              <th className="p-4">Area</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Ativo</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((outlet) => (
              <tr key={outlet.outlet_id} className="border-t">

                <td className="p-4">
                  {outlet.outlet_id}
                </td>

                {languages.map((lang) => {
                  const field = `outlet_name${lang.safe_order}`;

                  return (
                    <td key={lang.lang_id} className="p-4">
                      {outlet[field]}
                    </td>
                  );
                })}

                <td className="p-4">
                  {getAreaName(outlet.area_id)}
                </td>

                <td className="p-4">
                  {getTypeLabel(outlet.outlet_type)}
                </td>

                <td className="p-4">
                  <button
                    type="button"
                    onClick={() => toggleVisible(outlet)}
                    disabled={visibilityUpdatingId === outlet.outlet_id}
                    className={`px-3 py-1 rounded-lg text-white ${
                      visibilityUpdatingId === outlet.outlet_id
                        ? "bg-gray-400 cursor-not-allowed"
                        : outlet.visible === false
                          ? "bg-gray-500 hover:bg-gray-600"
                          : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {visibilityUpdatingId === outlet.outlet_id
                      ? "A atualizar..."
                      : outlet.visible === false
                        ? "Não"
                        : "Sim"}
                  </button>
                </td>

                <td className="p-4 flex gap-2 justify-end">

                  <button
                    type="button"
                    onClick={() => openOutletQr(outlet)}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg"
                  >
                    <IoQrCode />
                  </button>

                  <button
                    onClick={() => openEdit(outlet)}
                    className="px-3 py-1 bg-gray-200 rounded-lg"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => remove(outlet.outlet_id)}
                    disabled={deletingId === outlet.outlet_id}
                    className={`px-3 py-1 rounded-lg ${deletingId === outlet.outlet_id ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 text-white"}`}
                  >
                    {deletingId === outlet.outlet_id ? "Eliminando..." : "Eliminar"}
                  </button>

                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl w-[450px] max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="min-h-0 overflow-y-auto p-6 flex flex-col gap-3">

            <h2 className="text-lg font-semibold">
              {editingId ? "Editar" : "Criar"} Outlet
            </h2>

            <div className="flex border-b">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "general"}
                onClick={() => setActiveTab("general")}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "general" ? "border-red-500 text-red-600" : "border-transparent text-gray-500"}`}
              >
                Geral
              </button>
              {form.reservation && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "tableReservation"}
                  onClick={() => setActiveTab("tableReservation")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "tableReservation" ? "border-red-500 text-red-600" : "border-transparent text-gray-500"}`}
                >
                  Reserva de Mesa
                </button>
              )}
              {form.access_points && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "accessPoints"}
                  onClick={() => setActiveTab("accessPoints")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "accessPoints" ? "border-red-500 text-red-600" : "border-transparent text-gray-500"}`}
                >
                  Pontos de acesso
                </button>
              )}
            </div>

            {activeTab === "general" ? (
              <>
                {languages.map((lang) => {
                  const field = `outlet_name${lang.safe_order}`;

                  return (
                    <div key={lang.lang_id} className="flex flex-col gap-0">
                      <label className="text-xs text-gray-500 font-bold">
                        Nome ({lang.lang_name})
                      </label>
                      <input
                        name={field}
                        value={form[field] || ""}
                        onChange={handleChange}
                        placeholder={lang.lang_name}
                        className="h-10 border rounded-lg px-3"
                      />
                    </div>
                  );
                })}

                <div className="flex flex-col gap-0">
                  <label className="text-xs text-gray-500 font-bold">
                    Área
                  </label>

                  <select
                    name="area_id"
                    value={form.area_id}
                    onChange={handleChange}
                    className="h-10 border rounded-lg px-2"
                    required
                  >
                    <option value="">Selecionar área</option>

                    {areas.map((a) => (
                      <option key={a.area_id} value={a.area_id}>
                        {a.area_name1}
                      </option>
                    ))}
                  </select>
                </div>

                {form.associate_schedule && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="general_schedule_id" className="text-xs text-gray-500 font-bold">
                        Horário associado
                      </label>
                      <select
                        id="general_schedule_id"
                        name="schedule_id"
                        value={form.schedule_id}
                        onChange={handleChange}
                        required={form.associate_schedule || form.reservation}
                        className="h-10 border rounded-lg px-2"
                      >
                        <option value="">Selecionar horário</option>
                        {schedules.map((schedule) => (
                          <option key={schedule.schedule_id} value={schedule.schedule_id}>
                            {getScheduleName(schedule)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="schedule_visible"
                        checked={Boolean(form.schedule_visible)}
                        onChange={handleSettingChange}
                        className="h-4 w-4 accent-red-500"
                      />
                      Horário visível
                    </label>
                  </>
                )}

                <h3 className="text-sm text-gray-600 font-semibold">Configurações de Outlet</h3>

                <div className="grid gap-2">
                  {[
                    ["associate_schedule", "Associar horário"],
                    ["access_points", "Permite pontos de acesso"],
                    ["reservation", "Permite reserva de mesa"],
                    ["service_reservation", "Permite reserva de serviços"],
                    ["takeaway_order", "Permite pedir para levar (encomenda)"],
                    ["order", "Permite pedir no outlet"],
                    ["instant_order", "Permite pedir pedidos instantâneos"],
                  ].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name={name}
                        checked={Boolean(form[name])}
                        onChange={handleSettingChange}
                        disabled={
                          name === "access_points" &&
                          form.access_points &&
                          (form.reservation ||
                            form.service_reservation ||
                            form.order ||
                            form.instant_order)
                        }
                        className="h-4 w-4 accent-red-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {/* IMAGE */}
            <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-red-400 hover:bg-red-50 transition flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-2">🖼️</div>

              <span className="font-medium text-gray-700">
                Clique para selecionar uma imagem
              </span>

              <span className="text-sm text-gray-500 mt-1">
                PNG, JPG, JPEG, WEBP
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
                    alert("A imagem não pode exceder 850 KB.");
                    return;
                  }

                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }}
              />
            </label>

            {imagePreview && (
              <div className="relative overflow-hidden rounded-xl border bg-gray-50">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />

                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    setExistingImage(null);
                  }}
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

                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-3 py-2">
                  Imagem selecionada
                </div>
              </div>
            )}
              </>
            ) : activeTab === "tableReservation" ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm text-gray-600 font-semibold">Configurações de reserva de mesa</h3>
                <div className="flex flex-col gap-1">
                  <label htmlFor="reservation_schedule_id" className="text-xs text-gray-500 font-bold">
                    Horário
                  </label>
                  <select
                    id="reservation_schedule_id"
                    name="schedule_id"
                    value={form.schedule_id}
                    onChange={handleChange}
                    required={form.reservation || form.associate_schedule}
                    className="h-10 border rounded-lg px-2"
                  >
                    <option value="">Selecionar horário</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.schedule_id} value={schedule.schedule_id}>
                        {getScheduleName(schedule)}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="schedule_visible"
                    checked={Boolean(form.schedule_visible)}
                    onChange={handleSettingChange}
                    className="h-4 w-4 accent-red-500"
                  />
                  Horário visível
                </label>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm text-gray-600 font-semibold">Configurações de pontos de acesso</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {accessRooms.map((room, index) => (
                    <button
                      key={room.id ?? `new-room-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedRoomIndex(index);
                        setIsEditingRoomName(false);
                        setAccessPointId("");
                      }}
                      aria-pressed={selectedRoomIndex === index}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        selectedRoomIndex === index
                          ? "border-red-500 bg-red-50 font-semibold text-red-600"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {room.name || `Sala ${index + 1}`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={addSpatialArea}
                    className="rounded-lg border border-dashed border-gray-400 px-3 py-2 text-sm text-gray-600 hover:border-red-500 hover:text-red-600"
                  >
                    + Adicionar área espacial
                  </button>
                </div>
                <div className="rounded-xl border border-gray-300 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    {isEditingRoomName ? (
                      <input
                        value={selectedAccessRoom.name}
                        onChange={(event) =>
                          updateSelectedRoom((room) => ({
                            ...room,
                            name: event.target.value,
                          }))
                        }
                        onBlur={() => setIsEditingRoomName(false)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            setIsEditingRoomName(false);
                          }
                        }}
                        autoFocus
                        maxLength={150}
                        aria-label="Nome da sala"
                        className="h-9 rounded-lg border px-3 font-semibold"
                      />
                    ) : (
                      <h4 className="font-semibold text-gray-800">
                        {selectedAccessRoom.name || `Sala ${selectedRoomIndex + 1}`}
                      </h4>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingRoomName((editing) => !editing)}
                      aria-label="Editar nome da sala"
                      title="Editar nome da sala"
                      className="rounded-lg p-2 text-gray-600 hover:bg-white hover:text-red-600"
                    >
                      ✎
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={accessPointId}
                      onChange={(event) => setAccessPointId(event.target.value)}
                      className="h-10 min-w-0 flex-1 rounded-lg border bg-white px-3"
                    >
                      <option value="">Selecionar ponto de acesso</option>
                      {availableAccessPoints.map((point) => (
                        <option
                          key={point.access_point_id}
                          value={point.access_point_id}
                        >
                          {point.access_point_name ||
                            `Ponto ${point.access_point_id}`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addAccessPoint}
                      disabled={!accessPointId}
                      className="shrink-0 rounded-lg bg-red-500 px-2.5 text-sm text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      + Adicionar ponto
                    </button>
                  </div>

                  {availableAccessPoints.length === 0 && (
                    <p className="mt-2 text-sm text-amber-700">
                      Não existem pontos de acesso disponíveis para associar.
                    </p>
                  )}

                  <div className="mt-4 min-h-48 overflow-hidden rounded-lg border border-slate-300 bg-white">
                    {selectedAccessRoom.points.length ? (
                      <ul className="divide-y divide-slate-200">
                        {selectedAccessRoom.points.map((point, index) => (
                          <li
                            key={point.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-700"
                          >
                            <span className="flex items-center gap-2">
                              <span aria-hidden="true" className="text-red-500">●</span>
                              {point.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedRoom((room) => ({
                                  ...room,
                                  points: room.points.filter(
                                    (_, pointIndex) => pointIndex !== index
                                  ),
                                }))
                              }
                              aria-label={`Remover ${point.name}`}
                              className="ml-1 text-gray-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex min-h-40 items-center justify-center text-sm text-gray-400">
                        Selecione pontos de acesso para esta área espacial.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            </div>

            <div className="flex justify-end gap-2 shrink-0 px-6 pb-6">

              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200"}`}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg ${isSaving ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-500 text-white"}`}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* CONTENT MODAL */}
      {showContentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white w-[90vw] h-[85vh] rounded-2xl p-6 flex flex-col">

            <h2 className="text-xl font-semibold mb-4">
              Conteúdo - {selectedSub?.outlet_name1}
            </h2>

            <div className="flex-1 overflow-hidden">
              <Editor
                value={editorContent}
                onChange={setEditorContent}
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">

              <button
                onClick={() => setShowContentModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Fechar
              </button>

              <button
                onClick={saveContent}
                className="px-4 py-2 bg-red-500 text-white rounded-lg"
              >
                Guardar
              </button>

            </div>

          </div>

        </div>
      )}

      {qrOutlet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <h2 className="text-xl font-semibold">
              QR Code - {qrOutlet.outlet_name1 || `Outlet ${qrOutlet.outlet_id}`}
            </h2>

            <div className="mt-4 text-left">
              <label
                htmlFor="outlet-qr-access-point"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Ponto de acesso (opcional)
              </label>
              <select
                id="outlet-qr-access-point"
                value={qrAccessPointId}
                onChange={(event) => {
                  const accessPointId = event.target.value;
                  setQrAccessPointId(accessPointId);
                  setQrUrl(buildOutletQrUrl(qrOutlet, accessPointId));
                }}
                disabled={isLoadingQrAccessPoints}
                className="h-10 w-full rounded-lg border px-3 disabled:bg-gray-100"
              >
                <option value="">
                  {isLoadingQrAccessPoints
                    ? "A carregar pontos de acesso..."
                    : "QR Code geral"}
                </option>
                {qrAccessPoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-2 break-all text-sm text-gray-500">{qrUrl}</p>

            <div className="my-6 flex justify-center">
              <QRCodeCanvas
                id="outlet-qr-code"
                value={qrUrl}
                size={240}
                level="H"
                includeMargin
              />
            </div>

            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setQrOutlet(null)}
                className="rounded-lg bg-gray-200 px-4 py-2"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={downloadOutletQr}
                className="rounded-lg bg-red-500 px-4 py-2 text-white"
              >
                Descarregar QR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}