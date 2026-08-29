import QRCode from "qrcode";

export async function generateQRCodeDataURL(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 400,
    margin: 2,
    color: {
      dark: "#1a1a1a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}

export async function generateQRCodeBuffer(text: string): Promise<Buffer> {
  return await QRCode.toBuffer(text, {
    width: 400,
    margin: 2,
    type: "png",
    color: {
      dark: "#1a1a1a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}

export function getTableUrl(qrToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/t/${qrToken}`;
}
