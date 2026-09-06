const MAX_ROOM_IMAGE_EDGE = 2400;

export const normalizeWallCorners = (corners) => {
  if (!Array.isArray(corners) || corners.length !== 4) return corners || [];
  const center = corners.reduce(
    (result, corner) => ({ resultX: result.resultX + corner.x / 4, resultY: result.resultY + corner.y / 4 }),
    { resultX: 0, resultY: 0 }
  );
  const aroundCenter = [...corners].sort(
    (left, right) =>
      Math.atan2(left.y - center.resultY, left.x - center.resultX) -
      Math.atan2(right.y - center.resultY, right.x - center.resultX)
  );
  const topLeftIndex = aroundCenter.reduce(
    (bestIndex, corner, index, items) =>
      corner.x + corner.y < items[bestIndex].x + items[bestIndex].y ? index : bestIndex,
    0
  );
  const ordered = [
    ...aroundCenter.slice(topLeftIndex),
    ...aroundCenter.slice(0, topLeftIndex),
  ];
  if (ordered[1].x < ordered[3].x) {
    return [ordered[0], ordered[3], ordered[2], ordered[1]];
  }
  return ordered;
};

const readExifOrientation = async (file) => {
  if (file.type !== "image/jpeg") return 1;
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return 1;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffda || marker === 0xffd9) break;
    const segmentLength = view.getUint16(offset, false);
    if (segmentLength < 2 || offset + segmentLength > view.byteLength) break;
    if (marker === 0xffe1 && segmentLength >= 10) {
      const exifStart = offset + 2;
      if (view.getUint32(exifStart, false) !== 0x45786966) break;
      const tiffStart = exifStart + 6;
      if (tiffStart + 8 > view.byteLength) break;
      const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
      const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
      const directoryStart = tiffStart + firstIfdOffset;
      if (directoryStart + 2 > view.byteLength) break;
      const entryCount = view.getUint16(directoryStart, littleEndian);
      for (let index = 0; index < entryCount; index += 1) {
        const entryOffset = directoryStart + 2 + index * 12;
        if (entryOffset + 12 > view.byteLength) break;
        if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
          return view.getUint16(entryOffset + 8, littleEndian) || 1;
        }
      }
      break;
    }
    offset += segmentLength;
  }
  return 1;
};

const orientImage = (image, orientation) => {
  const swapsDimensions = orientation >= 5 && orientation <= 8;
  const canvas = document.createElement("canvas");
  canvas.width = swapsDimensions ? image.height : image.width;
  canvas.height = swapsDimensions ? image.width : image.height;
  const context = canvas.getContext("2d");

  const transforms = {
    2: [-1, 0, 0, 1, canvas.width, 0],
    3: [-1, 0, 0, -1, canvas.width, canvas.height],
    4: [1, 0, 0, -1, 0, canvas.height],
    5: [0, 1, 1, 0, 0, 0],
    6: [0, 1, -1, 0, canvas.width, 0],
    7: [0, -1, -1, 0, canvas.width, canvas.height],
    8: [0, -1, 1, 0, 0, canvas.height],
  };
  if (transforms[orientation]) context.setTransform(...transforms[orientation]);
  context.drawImage(image, 0, 0);
  return canvas;
};

export const loadCanvasImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load an image used in this room."));
    image.src = source;
  });

export const prepareRoomPhoto = async (file) => {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Choose a JPG, PNG, or WebP room photo.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Room photos must be 12 MB or smaller.");
  }

  let bitmap;
  try {
    const orientation = await readExifOrientation(file);
    bitmap = await createImageBitmap(file, { imageOrientation: "none" });
    const orientedImage = orientImage(bitmap, orientation);
    const scale = Math.min(1, MAX_ROOM_IMAGE_EDGE / Math.max(orientedImage.width, orientedImage.height));
    const width = Math.max(1, Math.round(orientedImage.width * scale));
    const height = Math.max(1, Math.round(orientedImage.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(orientedImage, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("The room photo could not be prepared.");
    const safeName = `${(file.name || "room").replace(/\.[^.]+$/, "") || "room"}.jpg`;
    const cleanFile = new File([blob], safeName, { type: "image/jpeg" });
    return {
      file: cleanFile,
      source: URL.createObjectURL(cleanFile),
      width,
      height,
    };
  } finally {
    bitmap?.close?.();
  }
};

export const projectWallPoint = (corners, u, v, imageWidth, imageHeight) => {
  if (!corners || corners.length !== 4) return { x: 0, y: 0 };
  const points = corners.map((corner) => ({
    x: corner.x * imageWidth,
    y: corner.y * imageHeight,
  }));
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  return {
    x:
      topLeft.x * (1 - u) * (1 - v) +
      topRight.x * u * (1 - v) +
      bottomRight.x * u * v +
      bottomLeft.x * (1 - u) * v,
    y:
      topLeft.y * (1 - u) * (1 - v) +
      topRight.y * u * (1 - v) +
      bottomRight.y * u * v +
      bottomLeft.y * (1 - u) * v,
  };
};

export const imagePointToWall = (corners, x, y, imageWidth, imageHeight) => {
  let u = 0.5;
  let v = 0.5;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const point = projectWallPoint(corners, u, v, imageWidth, imageHeight);
    const du = projectWallPoint(corners, u + 0.0001, v, imageWidth, imageHeight);
    const dv = projectWallPoint(corners, u, v + 0.0001, imageWidth, imageHeight);
    const j00 = (du.x - point.x) / 0.0001;
    const j10 = (du.y - point.y) / 0.0001;
    const j01 = (dv.x - point.x) / 0.0001;
    const j11 = (dv.y - point.y) / 0.0001;
    const determinant = j00 * j11 - j01 * j10;
    if (Math.abs(determinant) < 0.000001) break;
    const errorX = x - point.x;
    const errorY = y - point.y;
    u += (errorX * j11 - errorY * j01) / determinant;
    v += (j00 * errorY - j10 * errorX) / determinant;
  }
  return { u, v };
};

const drawTriangle = (context, image, source, destination) => {
  const [s0, s1, s2] = source;
  const [d0, d1, d2] = destination;
  const determinant = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(determinant) < 0.000001) return;

  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / determinant;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / determinant;
  const e =
    (d0.x * (s1.x * s2.y - s2.x * s1.y) +
      d1.x * (s2.x * s0.y - s0.x * s2.y) +
      d2.x * (s0.x * s1.y - s1.x * s0.y)) /
    determinant;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / determinant;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / determinant;
  const f =
    (d0.y * (s1.x * s2.y - s2.x * s1.y) +
      d1.y * (s2.x * s0.y - s0.x * s2.y) +
      d2.y * (s0.x * s1.y - s1.x * s0.y)) /
    determinant;

  context.save();
  context.beginPath();
  context.moveTo(d0.x, d0.y);
  context.lineTo(d1.x, d1.y);
  context.lineTo(d2.x, d2.y);
  context.closePath();
  context.clip();
  context.transform(a, b, c, d, e, f);
  context.drawImage(image, 0, 0);
  context.restore();
};

const drawImageOnWall = (context, image, corners, wallWidth, wallHeight, placement, canvas) => {
  const startU = placement.x / wallWidth;
  const startV = placement.y / wallHeight;
  const endU = (placement.x + placement.width) / wallWidth;
  const endV = (placement.y + placement.height) / wallHeight;
  const divisions = 6;

  for (let row = 0; row < divisions; row += 1) {
    for (let column = 0; column < divisions; column += 1) {
      const left = column / divisions;
      const right = (column + 1) / divisions;
      const top = row / divisions;
      const bottom = (row + 1) / divisions;
      const wallPoint = (localU, localV) =>
        projectWallPoint(
          corners,
          startU + (endU - startU) * localU,
          startV + (endV - startV) * localV,
          canvas.width,
          canvas.height
        );
      const sourcePoint = (localU, localV) => ({
        x: localU * image.naturalWidth,
        y: localV * image.naturalHeight,
      });
      const s00 = sourcePoint(left, top);
      const s10 = sourcePoint(right, top);
      const s11 = sourcePoint(right, bottom);
      const s01 = sourcePoint(left, bottom);
      const d00 = wallPoint(left, top);
      const d10 = wallPoint(right, top);
      const d11 = wallPoint(right, bottom);
      const d01 = wallPoint(left, bottom);
      drawTriangle(context, image, [s00, s10, s11], [d00, d10, d11]);
      drawTriangle(context, image, [s00, s11, s01], [d00, d11, d01]);
    }
  }
};

export const drawRoomScene = ({
  canvas,
  roomImage,
  corners,
  wallWidth,
  wallHeight,
  placements,
  productImages,
  selectedId,
  calibrationPoints = [],
  includeGuides = true,
}) => {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(roomImage, 0, 0, canvas.width, canvas.height);

  if (corners.length === 4) {
    [...placements]
      .sort((left, right) => left.zIndex - right.zIndex)
      .forEach((placement) => {
        const image = productImages.get(String(placement.productId));
        if (image) drawImageOnWall(context, image, corners, wallWidth, wallHeight, placement, canvas);
      });
  }

  if (!includeGuides) return;
  const guidePoints = (calibrationPoints.length ? calibrationPoints : corners).map((corner) => ({
    x: corner.x * canvas.width,
    y: corner.y * canvas.height,
  }));
  if (guidePoints.length) {
    context.save();
    context.strokeStyle = "rgba(244, 63, 94, 0.95)";
    context.fillStyle = "rgba(244, 63, 94, 0.95)";
    context.lineWidth = Math.max(2, canvas.width / 600);
    context.setLineDash([12, 8]);
    context.beginPath();
    guidePoints.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    if (guidePoints.length === 4) context.closePath();
    context.stroke();
    context.setLineDash([]);
    guidePoints.forEach((point, index) => {
      context.beginPath();
      context.arc(point.x, point.y, Math.max(8, canvas.width / 120), 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "white";
      context.font = `bold ${Math.max(12, canvas.width / 75)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(index + 1), point.x, point.y);
      context.fillStyle = "rgba(244, 63, 94, 0.95)";
    });
    context.restore();
  }

  const selected = placements.find((placement) => placement.instanceId === selectedId);
  if (selected && corners.length === 4) {
    const points = [
      projectWallPoint(corners, selected.x / wallWidth, selected.y / wallHeight, canvas.width, canvas.height),
      projectWallPoint(corners, (selected.x + selected.width) / wallWidth, selected.y / wallHeight, canvas.width, canvas.height),
      projectWallPoint(corners, (selected.x + selected.width) / wallWidth, (selected.y + selected.height) / wallHeight, canvas.width, canvas.height),
      projectWallPoint(corners, selected.x / wallWidth, (selected.y + selected.height) / wallHeight, canvas.width, canvas.height),
    ];
    context.save();
    context.strokeStyle = "white";
    context.lineWidth = Math.max(5, canvas.width / 250);
    context.beginPath();
    points.forEach((point, index) => (index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
    context.closePath();
    context.stroke();
    context.strokeStyle = "#1c1917";
    context.lineWidth = Math.max(2, canvas.width / 600);
    context.stroke();
    context.restore();
  }
};
