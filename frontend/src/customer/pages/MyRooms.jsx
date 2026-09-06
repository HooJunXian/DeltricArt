import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { ShopContext } from "../context/shop-context";
import {
  deleteRoomCustomization,
  getRoomCustomizationImage,
  listRoomCustomizations,
} from "../services/roomCustomizationApi";

const MyRooms = () => {
  const { user, authLoading, openAuthModal, showToast } = useContext(ShopContext);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    let active = true;
    const privateImageUrls = [];
    listRoomCustomizations()
      .then(async ({ data }) => {
        const withImages = await Promise.all(
          (data || []).map(async (room) => {
            const response = await getRoomCustomizationImage(room.id);
            const imageUrl = URL.createObjectURL(response.data);
            privateImageUrls.push(imageUrl);
            return { ...room, local_image_url: imageUrl };
          })
        );
        if (active) setRooms(withImages);
      })
      .catch(() => {
        if (active) showToast({ type: "error", title: "Rooms not loaded", message: "Please try again shortly." });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      privateImageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [authLoading, showToast, user]);

  const removeRoom = async (room) => {
    if (!window.confirm(`Delete “${room.name}”? The private room photo and layout will be removed.`)) return;
    try {
      await deleteRoomCustomization(room.id);
      setRooms((current) => current.filter((item) => item.id !== room.id));
      showToast({ type: "success", title: "Room deleted", message: `${room.name} was removed.` });
    } catch {
      showToast({ type: "error", title: "Room not deleted", message: "Please try again." });
    }
  };

  if (authLoading || (user && loading)) {
    return <main className="grid min-h-[620px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-stone-500" /></main>;
  }

  if (!user) {
    return (
      <main className="mx-auto grid min-h-[620px] max-w-xl place-items-center px-4 text-center">
        <div>
          <ImagePlus className="mx-auto h-12 w-12 text-stone-400" />
          <h1 className="prata-regular mt-5 text-4xl text-stone-950">Your rooms are private</h1>
          <p className="mt-4 leading-7 text-stone-600">Sign in to reopen saved wall previews. You can still try the room editor as a guest.</p>
          <div className="mt-7 flex justify-center gap-3"><button type="button" onClick={() => openAuthModal("login")} className="bg-stone-950 px-6 py-3 font-semibold text-white">Sign In</button><Link to="/room-customizer" className="border border-stone-300 px-6 py-3 font-semibold">Try Editor</Link></div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-20 pt-10">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-stone-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.32em] text-rose-700">Private previews</p><h1 className="prata-regular mt-4 text-4xl text-stone-950 sm:text-5xl">My Rooms</h1><p className="mt-4 max-w-2xl leading-7 text-stone-600">Reopen an editable wall, review every artwork, or continue arranging your space.</p></div>
          <Link to="/room-customizer" className="inline-flex items-center justify-center gap-2 bg-stone-950 px-5 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Create Room</Link>
        </div>

        {rooms.length ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <article key={room.id} className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
                <Link to={`/room-customizer/${room.id}`} className="block aspect-[4/3] overflow-hidden bg-stone-100"><img src={room.local_image_url} alt={`${room.name} room preview`} className="h-full w-full object-cover transition duration-500 hover:scale-105" /></Link>
                <div className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-stone-950">{room.name}</h2><p className="mt-1 text-sm text-stone-500">{Number(room.wall_width_cm)} × {Number(room.wall_height_cm)} cm · {room.placements.length} placement{room.placements.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => removeRoom(room)} className="grid h-9 w-9 place-items-center text-stone-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${room.name}`}><Trash2 className="h-4 w-4" /></button></div><Link to={`/room-customizer/${room.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-rose-700"><Pencil className="h-4 w-4" /> Open and edit</Link></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 grid min-h-[380px] place-items-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-center"><div><ImagePlus className="mx-auto h-12 w-12 text-stone-400" /><h2 className="prata-regular mt-4 text-3xl text-stone-950">Create your first room</h2><p className="mt-3 text-stone-600">Upload a wall photo and preview artwork at real scale.</p><Link to="/room-customizer" className="mt-6 inline-flex bg-stone-950 px-6 py-3 font-semibold text-white">Start Designing</Link></div></div>
        )}
      </section>
    </main>
  );
};

export default MyRooms;
