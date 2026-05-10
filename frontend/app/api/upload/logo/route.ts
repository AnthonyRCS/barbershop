import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/lib/auth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "No autorizado" } },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: { code: "NO_FILE", message: "No se proporcionó ningún archivo" } },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: { code: "INVALID_TYPE", message: "El archivo debe ser una imagen" } },
      { status: 400 },
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "El archivo no puede superar 5 MB" } },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "barbershop/logos",
            transformation: [
              { width: 400, height: 400, crop: "limit", quality: "auto:good" },
            ],
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Cloudinary upload failed"));
            else resolve(result as { secure_url: string; public_id: string });
          },
        )
        .end(buffer);
    },
  );

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";
  const updateRes = await fetch(`${backendUrl}/api/v1/business/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.user.token}`,
    },
    body: JSON.stringify({ logoUrl: uploadResult.secure_url }),
  });

  if (!updateRes.ok) {
    return NextResponse.json(
      { error: { code: "UPDATE_FAILED", message: "Error al actualizar el logo del negocio" } },
      { status: 500 },
    );
  }

  return NextResponse.json({ logoUrl: uploadResult.secure_url });
}
