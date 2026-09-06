import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Camera,
  ChevronLeft,
  Copy,
  Download,
  ImagePlus,
  Focus,
  Layers3,
  Loader2,
  Maximize2,
  Minimize2,
  Redo2,
  RotateCw,
  Save,
  ShoppingCart,
  Trash2,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { ShopContext } from "../context/shop-context";
import {
  createRoomCustomization,
  getRoomCustomization,
  getRoomCustomizationImage,
  updateRoomCustomization,
} from "../services/roomCustomizationApi";
import {
  drawRoomScene,
  imagePointToWall,
  loadCanvasImage,
  normalizeWallCorners,
  prepareRoomPhoto,
} from "../utils/roomPreview";

const createInstanceId = () =>
  globalThis.crypto?.randomUUID?.() || `placement-${Date.now()}-${Math.random()}`;
const numberValue = (value) => Number(value || 0);
const productImage = (product) => product?.image?.[0] || product?.images?.[0] || "";
const firstApiError = (details) => {
  if (typeof details === "string") return details;
  if (Array.isArray(details)) {
    for (const item of details) {
      const message = firstApiError(item);
      if (message) return message;
    }
  }
  if (details && typeof details === "object") {
    for (const value of Object.values(details)) {
      const message = firstApiError(value);
      if (message) return message;
    }
  }
  return "";
};

const RoomCustomizer = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    products,
    productsLoading,
    user,
    authLoading,
    openAuthModal,
    addToCart,
    formatMoney,
    showToast,
  } = useContext(ShopContext);
  const canvasRef = useRef(null);
  const imageCacheRef = useRef({ room: null, products: new Map() });
  const dragRef = useRef(null);
  const autoAddedRef = useRef(false);

  const [name, setName] = useState("My Room");
  const [roomSource, setRoomSource] = useState("");
  const [roomFile, setRoomFile] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [wallWidth, setWallWidth] = useState("");
  const [wallHeight, setWallHeight] = useState("");
  const [corners, setCorners] = useState([]);
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [placements, setPlacements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [loadingRoom, setLoadingRoom] = useState(Boolean(roomId));
  const [saving, setSaving] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [isWorkspaceMode, setIsWorkspaceMode] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );
  const [workspacePanel, setWorkspacePanel] = useState(null);
  const [showSetupPanel, setShowSetupPanel] = useState(true);
  const [showArtworkPanel, setShowArtworkPanel] = useState(true);
  const [isMobileLandscape, setIsMobileLandscape] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px) and (orientation: landscape)").matches
  );
  const [isMobilePortrait, setIsMobilePortrait] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px) and (orientation: portrait)").matches
  );
  const [showRotateHint, setShowRotateHint] = useState(true);

  useEffect(() => {
    const landscapeQuery = window.matchMedia(
      "(max-width: 1023px) and (orientation: landscape)"
    );
    const portraitQuery = window.matchMedia(
      "(max-width: 1023px) and (orientation: portrait)"
    );
    const updateOrientation = () => {
      setIsMobileLandscape(landscapeQuery.matches);
      setIsMobilePortrait(portraitQuery.matches);
    };

    updateOrientation();
    landscapeQuery.addEventListener("change", updateOrientation);
    portraitQuery.addEventListener("change", updateOrientation);
    return () => {
      landscapeQuery.removeEventListener("change", updateOrientation);
      portraitQuery.removeEventListener("change", updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!isWorkspaceMode) return undefined;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const storefrontChrome = [
      document.querySelector("body header"),
      document.querySelector("body footer"),
      document.querySelector("#deltricart-chatbot-panel")?.parentElement,
    ].filter(Boolean);
    const previousChromeState = storefrontChrome.map((element) => ({
      element,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: element.inert,
    }));
    storefrontChrome.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    const handleWorkspaceKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (workspacePanel) {
        setWorkspacePanel(null);
      } else {
        setIsWorkspaceMode(false);
      }
    };

    window.addEventListener("keydown", handleWorkspaceKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWorkspaceKeyDown);
      document.documentElement.style.overflow = previousOverflow;
      previousChromeState.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", ariaHidden);
        }
      });
    };
  }, [isWorkspaceMode, workspacePanel]);

  const productsById = useMemo(
    () => new Map(products.map((product) => [String(product._id), product])),
    [products]
  );
  const eligibleProducts = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    return products.filter(
      (product) =>
        productImage(product) &&
        numberValue(product.width_cm) > 0 &&
        numberValue(product.height_cm) > 0 &&
        product.stock_balance > 0 &&
        (!query || product.name.toLowerCase().includes(query))
    );
  }, [catalogSearch, products]);

  const snapshot = useCallback((items) => items.map((item) => ({ ...item })), []);
  const changePlacements = useCallback(
    (updater) => {
      setPlacements((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        setUndoStack((history) => [...history.slice(-29), snapshot(current)]);
        setRedoStack([]);
        return next;
      });
    },
    [snapshot]
  );

  useEffect(() => {
    if (!roomId || authLoading) return;
    if (!user) {
      setLoadingRoom(false);
      return;
    }
    let active = true;
    let privateImageUrl = "";
    setLoadingRoom(true);
    Promise.all([getRoomCustomization(roomId), getRoomCustomizationImage(roomId)])
      .then(([{ data }, imageResponse]) => {
        if (!active) return;
        setName(data.name);
        privateImageUrl = URL.createObjectURL(imageResponse.data);
        setRoomSource(privateImageUrl);
        setImageSize({ width: data.image_width_px, height: data.image_height_px });
        setWallWidth(String(data.wall_width_cm));
        setWallHeight(String(data.wall_height_cm));
        setCorners(normalizeWallCorners(data.wall_corners || []));
        setPlacements(
          (data.placements || []).map((placement) => ({
            instanceId: `saved-${placement.id}`,
            recordId: placement.id,
            productId: String(placement.product_id),
            x: numberValue(placement.position_x_cm),
            y: numberValue(placement.position_y_cm),
            width: numberValue(placement.width_cm),
            height: numberValue(placement.height_cm),
            zIndex: placement.z_index,
          }))
        );
      })
      .catch(() => {
        showToast({ type: "error", title: "Room not found", message: "This saved room is unavailable." });
        navigate("/my-rooms", { replace: true });
      })
      .finally(() => active && setLoadingRoom(false));
    return () => {
      active = false;
      if (privateImageUrl) URL.revokeObjectURL(privateImageUrl);
    };
  }, [authLoading, navigate, roomId, showToast, user]);

  const addProduct = useCallback(
    (product, { quiet = false } = {}) => {
      const width = numberValue(product?.width_cm);
      const height = numberValue(product?.height_cm);
      const roomWidth = numberValue(wallWidth);
      const roomHeight = numberValue(wallHeight);
      if (!roomSource || corners.length !== 4 || !roomWidth || !roomHeight) {
        if (!quiet) showToast({ type: "error", title: "Calibrate the wall", message: "Upload a photo, reset coners, and enter its size first." });
        return false;
      }
      if (!width || !height) {
        if (!quiet) showToast({ type: "error", title: "Dimensions unavailable", message: "This artwork cannot be placed until its dimensions are added." });
        return false;
      }
      if (width > roomWidth || height > roomHeight) {
        if (!quiet) showToast({ type: "error", title: "Artwork is too large", message: "This artwork does not fit inside the calibrated wall." });
        return false;
      }
      const instanceId = createInstanceId();
      changePlacements((current) => [
        ...current,
        {
          instanceId,
          productId: String(product._id),
          x: Math.max(0, (roomWidth - width) / 2),
          y: Math.max(0, (roomHeight - height) / 2),
          width,
          height,
          zIndex: current.length,
        },
      ]);
      setSelectedId(instanceId);
      return true;
    },
    [changePlacements, corners.length, roomSource, showToast, wallHeight, wallWidth]
  );

  useEffect(() => {
    const initialProduct = productsById.get(String(searchParams.get("product") || ""));
    if (
      !autoAddedRef.current &&
      initialProduct &&
      roomSource &&
      corners.length === 4 &&
      numberValue(wallWidth) &&
      numberValue(wallHeight)
    ) {
      autoAddedRef.current = true;
      addProduct(initialProduct, { quiet: true });
    }
  }, [addProduct, corners.length, productsById, roomSource, searchParams, wallHeight, wallWidth]);

  useEffect(() => {
    if (!roomSource || !canvasRef.current) return;
    let active = true;
    const uniqueProductIds = [...new Set(placements.map((item) => item.productId))];
    Promise.all([
      loadCanvasImage(roomSource),
      ...uniqueProductIds.filter((productId) => productImage(productsById.get(productId))).map(async (productId) => [
        productId,
        await loadCanvasImage(productImage(productsById.get(productId))),
      ]),
    ])
      .then(([roomImage, ...loadedProducts]) => {
        if (!active) return;
        const canvas = canvasRef.current;
        canvas.width = roomImage.naturalWidth;
        canvas.height = roomImage.naturalHeight;
        imageCacheRef.current = { room: roomImage, products: new Map(loadedProducts) };
        drawRoomScene({
          canvas,
          roomImage,
          corners,
          wallWidth: numberValue(wallWidth),
          wallHeight: numberValue(wallHeight),
          placements,
          productImages: imageCacheRef.current.products,
          selectedId,
          calibrationPoints,
        });
        setRenderError("");
      })
      .catch((error) => active && setRenderError(error.message));
    return () => {
      active = false;
    };
  }, [calibrationPoints, corners, placements, productsById, roomSource, selectedId, wallHeight, wallWidth]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        const tag = document.activeElement?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          event.preventDefault();
          changePlacements((current) => current.filter((item) => item.instanceId !== selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changePlacements, selectedId]);

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const prepared = await prepareRoomPhoto(file);
      setRoomSource(prepared.source);
      setRoomFile(prepared.file);
      setImageSize({ width: prepared.width, height: prepared.height });
      setCorners([]);
      setCalibrationPoints([]);
      setIsCalibrating(true);
      setPlacements([]);
      setSelectedId(null);
      setUndoStack([]);
      setRedoStack([]);
      autoAddedRef.current = false;
    } catch (error) {
      showToast({ type: "error", title: "Photo not loaded", message: error.message });
    }
    event.target.value = "";
  };

  const canvasPoint = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  };

  const pointerToWall = (event) => {
    const point = canvasPoint(event);
    const wallPoint = imagePointToWall(corners, point.x, point.y, canvasRef.current.width, canvasRef.current.height);
    return { x: wallPoint.u * numberValue(wallWidth), y: wallPoint.v * numberValue(wallHeight) };
  };

  const handlePointerDown = (event) => {
    if (isCalibrating) {
      const point = canvasPoint(event);
      const next = [
        ...calibrationPoints,
        { x: point.x / canvasRef.current.width, y: point.y / canvasRef.current.height },
      ].slice(0, 4);
      setCalibrationPoints(next);
      if (next.length === 4) {
        setCorners(normalizeWallCorners(next));
        setCalibrationPoints([]);
        setIsCalibrating(false);
      }
      return;
    }
    if (corners.length !== 4) return;
    const point = pointerToWall(event);
    const selected = [...placements]
      .sort((left, right) => right.zIndex - left.zIndex)
      .find(
        (item) =>
          point.x >= item.x &&
          point.x <= item.x + item.width &&
          point.y >= item.y &&
          point.y <= item.y + item.height
      );
    if (!selected) {
      setSelectedId(null);
      return;
    }
    setSelectedId(selected.instanceId);
    dragRef.current = {
      instanceId: selected.instanceId,
      offsetX: point.x - selected.x,
      offsetY: point.y - selected.y,
      before: snapshot(placements),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointerToWall(event);
    setPlacements((current) =>
      current.map((item) => {
        if (item.instanceId !== drag.instanceId) return item;
        const nextX = Math.min(numberValue(wallWidth) - item.width, Math.max(0, point.x - drag.offsetX));
        const nextY = Math.min(numberValue(wallHeight) - item.height, Math.max(0, point.y - drag.offsetY));
        if (Math.abs(nextX - item.x) > 0.01 || Math.abs(nextY - item.y) > 0.01) drag.moved = true;
        return { ...item, x: nextX, y: nextY };
      })
    );
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    if (drag?.moved) {
      setUndoStack((history) => [...history.slice(-29), drag.before]);
      setRedoStack([]);
    }
    dragRef.current = null;
  };

  const undo = () => {
    if (!undoStack.length) return;
    setUndoStack((history) => {
      const previous = history[history.length - 1];
      setRedoStack((future) => [...future, snapshot(placements)]);
      setPlacements(previous);
      setSelectedId(null);
      return history.slice(0, -1);
    });
  };

  const redo = () => {
    if (!redoStack.length) return;
    setRedoStack((future) => {
      const next = future[future.length - 1];
      setUndoStack((history) => [...history, snapshot(placements)]);
      setPlacements(next);
      setSelectedId(null);
      return future.slice(0, -1);
    });
  };

  const selectedPlacement = placements.find((item) => item.instanceId === selectedId);
  const removeSelected = () => {
    if (!selectedId) return;
    changePlacements((current) => current.filter((item) => item.instanceId !== selectedId));
    setSelectedId(null);
  };
  const duplicateSelected = () => {
    if (!selectedPlacement) return;
    const instanceId = createInstanceId();
    changePlacements((current) => [
      ...current,
        {
          ...selectedPlacement,
          instanceId,
          recordId: null,
        x: Math.min(numberValue(wallWidth) - selectedPlacement.width, selectedPlacement.x + 10),
        y: Math.min(numberValue(wallHeight) - selectedPlacement.height, selectedPlacement.y + 10),
        zIndex: current.length,
      },
    ]);
    setSelectedId(instanceId);
  };
  const saveRoom = async () => {
    if (!user) {
      openAuthModal("login");
      showToast({ type: "error", title: "Sign in to save", message: "Your current room stays open while you sign in." });
      return;
    }
    if (!roomSource || corners.length !== 4 || !numberValue(wallWidth) || !numberValue(wallHeight)) {
      showToast({ type: "error", title: "Room is incomplete", message: "Add a room photo, four corners, width, and height." });
      return;
    }
    if (!roomId && !roomFile) {
      showToast({ type: "error", title: "Photo required", message: "Upload a room photo before saving." });
      return;
    }
    const form = new FormData();
    form.append("name", name.trim() || "My Room");
    if (roomFile) form.append("room_image", roomFile);
    form.append("wall_width_cm", numberValue(wallWidth).toFixed(2));
    form.append("wall_height_cm", numberValue(wallHeight).toFixed(2));
    form.append("wall_corners", JSON.stringify(corners));
    form.append("image_width_px", String(imageSize.width || canvasRef.current?.width || 0));
    form.append("image_height_px", String(imageSize.height || canvasRef.current?.height || 0));
    form.append(
      "placements_payload",
      JSON.stringify(
        placements.map((item, index) => ({
          ...(item.recordId ? { placement_id: item.recordId } : {}),
          product_id: Number(item.productId),
          position_x_cm: item.x.toFixed(2),
          position_y_cm: item.y.toFixed(2),
          z_index: index,
        }))
      )
    );
    setSaving(true);
    try {
      const response = roomId
        ? await updateRoomCustomization(roomId, form)
        : await createRoomCustomization(form);
      showToast({ type: "success", title: "Room saved", message: `${response.data.name} is available in My Rooms.` });
      if (!roomId) navigate(`/room-customizer/${response.data.id}`, { replace: true });
    } catch (error) {
      const details = error.response?.data;
      showToast({
        type: "error",
        title: "Room not saved",
        message: firstApiError(details) || "Review the wall and artwork positions, then try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadPreview = async () => {
    const cache = imageCacheRef.current;
    if (!cache.room || !canvasRef.current) return;
    const output = document.createElement("canvas");
    output.width = cache.room.naturalWidth;
    output.height = cache.room.naturalHeight;
    drawRoomScene({
      canvas: output,
      roomImage: cache.room,
      corners,
      wallWidth: numberValue(wallWidth),
      wallHeight: numberValue(wallHeight),
      placements,
      productImages: cache.products,
      includeGuides: false,
    });
    try {
      const blob = await new Promise((resolve) => output.toBlob(resolve, "image/png"));
      if (!blob) throw new Error();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${(name.trim() || "my-room").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {
      showToast({ type: "error", title: "Download blocked", message: "One of the artwork images does not allow browser export." });
    }
  };

  const groupedProducts = useMemo(() => {
    const groups = new Map();
    placements.forEach((item) => {
      const current = groups.get(item.productId) || { product: productsById.get(item.productId), count: 0 };
      current.count += 1;
      groups.set(item.productId, current);
    });
    return [...groups.entries()].map(([productId, group]) => ({ productId, ...group }));
  }, [placements, productsById]);

  const addAllToCart = async () => {
    let added = 0;
    for (const item of groupedProducts) {
      if (!item.product || item.product.stock_balance <= 0) continue;
      const success = await addToCart(item.productId);
      if (!success) {
        if (!user) break;
      } else added += 1;
    }
    if (added) showToast({ type: "success", title: "Cart updated", message: `${added} distinct artwork${added === 1 ? "" : "s"} added.` });
  };

  const setupPanelContent = (
    <>
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Room name
        </label>
        <input
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full border border-stone-300 px-3 py-3 text-sm outline-none focus:border-stone-950"
        />
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-stone-400 px-4 py-4 text-sm font-semibold hover:border-stone-950">
        <Upload className="h-4 w-4" />
        {roomSource ? "Replace room photo" : "Upload room photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handlePhoto}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="min-w-0 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Width (cm)
          <input
            type="number"
            min="1"
            step="0.01"
            value={wallWidth}
            onChange={(event) => setWallWidth(event.target.value)}
            className="mt-2 w-full border border-stone-300 px-3 py-3 text-sm text-stone-950 outline-none"
          />
        </label>
        <label className="min-w-0 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Height (cm)
          <input
            type="number"
            min="1"
            step="0.01"
            value={wallHeight}
            onChange={(event) => setWallHeight(event.target.value)}
            className="mt-2 w-full border border-stone-300 px-3 py-3 text-sm text-stone-950 outline-none"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={!roomSource}
        onClick={() => {
          setCalibrationPoints([]);
          setCorners([]);
          setIsCalibrating(true);
          setWorkspacePanel(null);
        }}
        className="flex w-full items-center justify-center gap-2 bg-rose-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Focus className="h-4 w-4" /> Rest Corners
      </button>
      <div className="border-t border-stone-200 pt-4 text-xs leading-5 text-stone-500">
        {isCalibrating ? (
          <p className="font-semibold text-rose-700">
            {calibrationPoints.length}/4 selected. Click any remaining wall corner.
          </p>
        ) : corners.length === 4 ? (
          <p className="font-semibold text-emerald-700">Wall calibrated with four corners.</p>
        ) : (
          <p>Upload a photo and mark the four wall corners in any order.</p>
        )}
        <p className="mt-2">For accurate scale, enter both real wall dimensions.</p>
      </div>
    </>
  );

  const placedArtworkContent = (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-950">Artworks in room</h2>
        <span className="text-xs text-stone-500">{placements.length} placed</span>
      </div>
      <div className="mt-4 space-y-3">
        {groupedProducts.length ? (
          groupedProducts.map(({ productId, product, count }) => (
            <div
              key={productId}
              className="grid grid-cols-[52px_1fr] gap-3 border-b border-stone-100 pb-3"
            >
              <img src={productImage(product)} alt="" className="h-14 w-13 object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {product?.name || "Unavailable artwork"}
                </p>
                <p className="text-xs text-stone-500">
                  Placed {count}× · {product ? formatMoney(product.price) : "Unavailable"}
                </p>
                <button
                  type="button"
                  disabled={!product || product.stock_balance <= 0}
                  onClick={async () => {
                    const added = await addToCart(productId);
                    if (added) {
                      showToast({
                        type: "success",
                        title: "Added to cart",
                        message: `${product.name} was added once.`,
                      });
                    }
                  }}
                  className="mt-2 text-xs font-semibold text-rose-700 disabled:text-stone-400"
                >
                  Add one to cart
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="py-5 text-center text-sm text-stone-500">No artwork placed yet.</p>
        )}
      </div>
      <button
        type="button"
        disabled={!groupedProducts.length}
        onClick={addAllToCart}
        className="mt-4 flex w-full items-center justify-center gap-2 bg-stone-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        <ShoppingCart className="h-4 w-4" /> Add All Distinct Artworks
      </button>
    </div>
  );

  const artworkCatalogContent = (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2
        className={`font-semibold text-stone-950 ${
          isWorkspaceMode ? "hidden xl:block" : ""
        }`}
      >
        Add artwork
      </h2>
      <input
        type="search"
        value={catalogSearch}
        onChange={(event) => setCatalogSearch(event.target.value)}
        placeholder="Search available artworks"
        className="mt-3 w-full border border-stone-300 px-3 py-2 text-sm outline-none"
      />
      <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto">
        {eligibleProducts.map((product) => (
          <button
            key={product._id}
            type="button"
            onClick={() => {
              if (addProduct(product)) setWorkspacePanel(null);
            }}
            className="grid grid-cols-[48px_1fr_auto] items-center gap-3 border border-stone-200 p-2 text-left hover:border-stone-950"
          >
            <img src={productImage(product)} alt="" className="h-12 w-12 object-cover" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{product.name}</span>
              <span className="block text-xs text-stone-500">
                {numberValue(product.width_cm)} × {numberValue(product.height_cm)} cm
              </span>
            </span>
            <ImagePlus className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );

  const compactDrawerClass = isMobileLandscape
    ? "absolute inset-y-0 left-0 w-[min(340px,calc(100%_-_2rem))] max-h-none overflow-y-auto border-r border-stone-200 bg-white shadow-xl transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none"
    : "absolute inset-x-3 bottom-3 z-30 max-h-[min(72dvh,620px)] overflow-y-auto rounded-lg shadow-2xl";

  if (loadingRoom || productsLoading) {
    return <main className="grid min-h-[620px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-stone-500" /></main>;
  }
  if (roomId && !authLoading && !user) {
    return (
      <main className="mx-auto grid min-h-[620px] max-w-xl place-items-center px-4 text-center">
        <div><h1 className="prata-regular text-4xl">Sign in to open this room</h1><p className="mt-4 text-stone-600">Saved room photos are private to their owner.</p><button type="button" onClick={() => openAuthModal("login")} className="mt-7 bg-stone-950 px-6 py-3 font-semibold text-white">Sign In</button></div>
      </main>
    );
  }

  return (
    <main
      className={
        isWorkspaceMode
          ? "fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-stone-100 text-stone-950"
          : "pb-20 pt-8"
      }
    >
      <section
        className={
          isWorkspaceMode
            ? "flex min-h-0 flex-1 flex-col"
            : "mx-auto max-w-[1600px]"
        }
      >
        {isWorkspaceMode ? (
          <header
            className={`flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-3 shadow-sm sm:px-5 ${
              isMobileLandscape ? "h-12 min-h-12" : "min-h-16"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-950 sm:text-base">
                View In My Room
              </p>
              <p
                className={`truncate text-[11px] text-stone-500 sm:text-xs ${
                  isMobileLandscape ? "hidden" : ""
                }`}
              >
                {name || "My Room"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="mr-1 hidden items-center gap-1 xl:flex">
                <button
                  type="button"
                  onClick={() => setShowSetupPanel((current) => !current)}
                  className={`border px-3 py-2 text-xs font-semibold ${
                    showSetupPanel
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-300 bg-white text-stone-700"
                  }`}
                  aria-pressed={showSetupPanel}
                >
                  Room setup
                </button>
                <button
                  type="button"
                  onClick={() => setShowArtworkPanel((current) => !current)}
                  className={`border px-3 py-2 text-xs font-semibold ${
                    showArtworkPanel
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-300 bg-white text-stone-700"
                  }`}
                  aria-pressed={showArtworkPanel}
                >
                  Artwork panels
                </button>
              </div>
              <button
                type="button"
                onClick={downloadPreview}
                disabled={!roomSource || placements.length === 0}
                className="inline-flex h-10 items-center gap-2 border border-stone-300 px-3 text-sm font-semibold disabled:opacity-40"
                aria-label="Save preview as PNG"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PNG</span>
              </button>
              <button
                type="button"
                onClick={saveRoom}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 bg-stone-950 px-3 text-sm font-semibold text-white disabled:opacity-50 sm:px-4"
                aria-label="Save wall"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </header>
        ) : (
          <div className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                to={user ? "/my-rooms" : "/products"}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 hover:text-stone-950"
              >
                ← {user ? "My Rooms" : "Products"}
              </Link>
              <h1 className="prata-regular mt-3 text-4xl text-stone-950 sm:text-5xl">
                View In My Room
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                Your artwork remains at its real-world size. Room photos stay on this device
                until you choose Save Wall.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadPreview}
                disabled={!roomSource || placements.length === 0}
                className="inline-flex items-center gap-2 border border-stone-300 px-4 py-3 text-sm font-semibold disabled:opacity-40"
              >
                <Download className="h-4 w-4" /> Save as PNG
              </button>
              <button
                type="button"
                onClick={saveRoom}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Wall
              </button>
            </div>
          </div>
        )}

        {isWorkspaceMode && isMobilePortrait && showRotateHint ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="flex min-w-0 items-center gap-2">
              <RotateCw className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Rotate your phone for a larger editing area.</span>
            </p>
            <button
              type="button"
              onClick={() => setShowRotateHint(false)}
              className="grid h-7 w-7 shrink-0 place-items-center"
              aria-label="Dismiss landscape suggestion"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div
          className={
            isWorkspaceMode
              ? `relative flex min-h-0 flex-1 overflow-hidden ${
                  isMobileLandscape ? "ml-16" : ""
                }`
              : "grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]"
          }
        >
          {isWorkspaceMode && workspacePanel && !isMobileLandscape ? (
            <button
              type="button"
              className="absolute inset-0 z-20 bg-black/35 xl:hidden"
              onClick={() => setWorkspacePanel(null)}
              aria-label="Close editor panel overlay"
            />
          ) : null}

          <aside
            aria-hidden={
              isWorkspaceMode && isMobileLandscape && workspacePanel !== "setup"
            }
            inert={isWorkspaceMode && isMobileLandscape && workspacePanel !== "setup"}
            className={
              isWorkspaceMode
                ? `${
                    isMobileLandscape
                      ? workspacePanel === "setup"
                        ? "z-30 translate-x-0 pointer-events-auto"
                        : "z-20 -translate-x-full pointer-events-none"
                      : workspacePanel === "setup"
                        ? "block"
                        : "hidden"
                  } ${compactDrawerClass} space-y-5 border border-stone-200 bg-white p-5 xl:static xl:inset-auto xl:z-auto xl:max-h-none xl:w-72 xl:shrink-0 xl:translate-x-0 xl:rounded-none xl:border-y-0 xl:border-l-0 xl:shadow-none ${
                    showSetupPanel ? "xl:block" : "xl:hidden"
                  }`
                : "space-y-5 rounded-lg border border-stone-200 bg-white p-5 xl:sticky xl:top-28 xl:h-fit"
            }
          >
            {isWorkspaceMode ? (
              <div className="flex items-center justify-between border-b border-stone-200 pb-4 xl:hidden">
                <h2 className="font-semibold">Room setup</h2>
                {!isMobileLandscape ? (
                  <button
                    type="button"
                    onClick={() => setWorkspacePanel(null)}
                    className="grid h-9 w-9 place-items-center border border-stone-200"
                    aria-label="Close room setup"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
            {isWorkspaceMode && isMobileLandscape ? (
              <button
                type="button"
                onClick={() => setWorkspacePanel(null)}
                className="group absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-[0_8px_24px_rgba(28,25,23,0.18)] transition-all duration-200 hover:border-stone-950 hover:bg-stone-950 hover:text-white active:scale-95 motion-reduce:transition-none"
                aria-label="Collapse room setup"
                title="Collapse room setup"
              >
                <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none" />
              </button>
            ) : null}
            {setupPanelContent}
          </aside>

          <section
            className={
              isWorkspaceMode
                ? "flex min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-4"
                : "min-w-0"
            }
          >
            <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 sm:mb-3">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!undoStack.length}
                  className="grid h-9 w-9 place-items-center border border-stone-300 bg-white disabled:opacity-30 sm:h-10 sm:w-10"
                  aria-label="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!redoStack.length}
                  className="grid h-9 w-9 place-items-center border border-stone-300 bg-white disabled:opacity-30 sm:h-10 sm:w-10"
                  aria-label="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={duplicateSelected}
                  disabled={!selectedPlacement}
                  className="grid h-9 w-9 place-items-center border border-stone-300 bg-white disabled:opacity-30 sm:h-10 sm:w-10"
                  aria-label="Duplicate selected artwork"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={removeSelected}
                  disabled={!selectedPlacement}
                  className="grid h-9 w-9 place-items-center border border-stone-300 bg-white text-rose-700 disabled:opacity-30 sm:h-10 sm:w-10"
                  aria-label="Remove selected artwork"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isWorkspaceMode) {
                      setWorkspacePanel(null);
                    }
                    setIsWorkspaceMode((current) => !current);
                  }}
                  className="grid h-9 w-9 place-items-center border border-stone-300 bg-white text-stone-800 hover:border-stone-950 sm:h-10 sm:w-10"
                  aria-label={
                    isWorkspaceMode ? "Exit fullscreen editor" : "Open fullscreen editor"
                  }
                  title={
                    isWorkspaceMode ? "Exit fullscreen editor" : "Open fullscreen editor"
                  }
                >
                  {isWorkspaceMode ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))}
                    className="grid h-9 w-9 place-items-center border border-stone-300 bg-white sm:h-10 sm:w-10"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-xs font-semibold sm:w-14">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((value) => Math.min(1.8, value + 0.1))}
                    className="grid h-9 w-9 place-items-center border border-stone-300 bg-white sm:h-10 sm:w-10"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`overflow-auto rounded-lg border border-stone-300 bg-stone-200 p-2 shadow-inner sm:p-3 ${
                isWorkspaceMode ? "min-h-0 flex-1" : ""
              }`}
            >
              {roomSource ? (
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`mx-auto block max-w-none touch-none bg-white shadow-xl ${
                    isCalibrating ? "cursor-crosshair" : "cursor-move"
                  }`}
                  style={{ width: `${zoom * 100}%`, height: "auto" }}
                  aria-label="Interactive room preview"
                />
              ) : (
                <label
                  className={`grid cursor-pointer place-items-center bg-stone-100 px-5 text-center ${
                    isWorkspaceMode
                      ? isMobileLandscape
                        ? "h-full min-h-0"
                        : "h-full min-h-[260px]"
                      : "min-h-[520px]"
                  }`}
                >
                  <span>
                    <Camera className="mx-auto h-12 w-12 text-stone-400" />
                    <span className="mt-4 block font-semibold text-stone-700">
                      Upload a photo of your wall
                    </span>
                    <span className="mt-2 block text-sm text-stone-500">
                      JPG, PNG, or WebP · maximum 12 MB
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handlePhoto}
                  />
                </label>
              )}
            </div>

            {renderError ? <p className="mt-3 text-sm text-rose-700">{renderError}</p> : null}
            {selectedPlacement ? (
              <div className="mt-2 flex shrink-0 flex-wrap gap-x-5 gap-y-1 border border-stone-200 bg-white px-4 py-2 text-xs text-stone-600 sm:mt-3 sm:py-3">
                <span>Left: {selectedPlacement.x.toFixed(1)} cm</span>
                <span>Top: {selectedPlacement.y.toFixed(1)} cm</span>
                <span>
                  Right: {(numberValue(wallWidth) - selectedPlacement.x - selectedPlacement.width).toFixed(1)} cm
                </span>
                <span>
                  Bottom: {(numberValue(wallHeight) - selectedPlacement.y - selectedPlacement.height).toFixed(1)} cm
                </span>
              </div>
            ) : null}
          </section>

          <aside
            aria-hidden={
              isWorkspaceMode &&
              isMobileLandscape &&
              workspacePanel !== "artworks" &&
              workspacePanel !== "placed"
            }
            inert={
              isWorkspaceMode &&
              isMobileLandscape &&
              workspacePanel !== "artworks" &&
              workspacePanel !== "placed"
            }
            className={
              isWorkspaceMode
                ? `${
                    isMobileLandscape
                      ? workspacePanel === "artworks" || workspacePanel === "placed"
                        ? "z-30 translate-x-0 pointer-events-auto"
                        : "z-20 -translate-x-full pointer-events-none"
                      : workspacePanel === "artworks" || workspacePanel === "placed"
                        ? "block"
                        : "hidden"
                  } ${compactDrawerClass} space-y-5 bg-white p-4 xl:static xl:inset-auto xl:z-auto xl:max-h-none xl:w-80 xl:shrink-0 xl:translate-x-0 xl:overflow-y-auto xl:rounded-none xl:border-l xl:border-stone-200 xl:bg-stone-50 xl:p-4 xl:shadow-none ${
                    showArtworkPanel ? "xl:block" : "xl:hidden"
                  }`
                : "space-y-5 xl:sticky xl:top-28 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto"
            }
          >
            {isWorkspaceMode ? (
              <div className="flex items-center justify-between border-b border-stone-200 pb-3 xl:hidden">
                <h2 className="font-semibold">
                  {workspacePanel === "placed" ? "Placed artworks" : "Add artwork"}
                </h2>
                {!isMobileLandscape ? (
                  <button
                    type="button"
                    onClick={() => setWorkspacePanel(null)}
                    className="grid h-9 w-9 place-items-center border border-stone-200"
                    aria-label="Close artwork panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
            {isWorkspaceMode && isMobileLandscape ? (
              <button
                type="button"
                onClick={() => setWorkspacePanel(null)}
                className="group absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-[0_8px_24px_rgba(28,25,23,0.18)] transition-all duration-200 hover:border-stone-950 hover:bg-stone-950 hover:text-white active:scale-95 motion-reduce:transition-none"
                aria-label="Collapse artwork panel"
                title="Collapse artwork panel"
              >
                <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none" />
              </button>
            ) : null}
            <div className={isWorkspaceMode && workspacePanel !== "placed" ? "hidden xl:block" : ""}>
              {placedArtworkContent}
            </div>
            <div className={isWorkspaceMode && workspacePanel !== "artworks" ? "hidden xl:block" : ""}>
              {artworkCatalogContent}
            </div>
          </aside>
        </div>

        {isWorkspaceMode ? (
          <nav
            className={
              isMobileLandscape
                ? "absolute bottom-0 left-0 top-12 z-40 flex w-16 flex-col border-r border-stone-200 bg-white xl:hidden"
                : "grid shrink-0 grid-cols-3 border-t border-stone-200 bg-white pb-[max(0.25rem,env(safe-area-inset-bottom))] xl:hidden"
            }
          >
            <button
              type="button"
              onClick={() => setWorkspacePanel((current) => (current === "setup" ? null : "setup"))}
              className={`flex items-center justify-center font-semibold ${
                isMobileLandscape
                  ? "min-h-0 flex-1 flex-col gap-1 px-1 text-[10px]"
                  : "min-h-14 gap-2 text-xs"
              } ${
                workspacePanel === "setup" ? "bg-stone-950 text-white" : "text-stone-700"
              }`}
              aria-pressed={workspacePanel === "setup"}
            >
              <Focus className="h-4 w-4" /> Room
            </button>
            <button
              type="button"
              onClick={() =>
                setWorkspacePanel((current) => (current === "artworks" ? null : "artworks"))
              }
              className={`flex items-center justify-center font-semibold ${
                isMobileLandscape
                  ? "min-h-0 flex-1 flex-col gap-1 px-1 text-[10px]"
                  : "min-h-14 gap-2 text-xs"
              } ${
                workspacePanel === "artworks" ? "bg-stone-950 text-white" : "text-stone-700"
              }`}
              aria-pressed={workspacePanel === "artworks"}
            >
              <ImagePlus className="h-4 w-4" /> Artworks
            </button>
            <button
              type="button"
              onClick={() => setWorkspacePanel((current) => (current === "placed" ? null : "placed"))}
              className={`flex items-center justify-center font-semibold ${
                isMobileLandscape
                  ? "min-h-0 flex-1 flex-col gap-1 px-1 text-[10px]"
                  : "min-h-14 gap-2 text-xs"
              } ${
                workspacePanel === "placed" ? "bg-stone-950 text-white" : "text-stone-700"
              }`}
              aria-pressed={workspacePanel === "placed"}
            >
              <Layers3 className="h-4 w-4" /> Placed ({placements.length})
            </button>
          </nav>
        ) : null}
      </section>
    </main>
  );
};

export default RoomCustomizer;
