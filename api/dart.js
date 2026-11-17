
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "GET 요청만 허용합니다."
    });
  }

  try {
    const response = await fetch(
      "https://opendart.fss.or.kr/",
      {
        method: "GET",
        signal: AbortSignal.timeout(10000)
      }
    );

    return res.status(200).json({
      success: true,
      connected: true,
      httpStatus: response.status,
      message: "OpenDART 서버 연결 성공"
    });

  } catch (error) {
    return res.status(502).json({
      success: false,
      connected: false,
      errorType: error?.name ?? "Unknown",
      errorCode: error?.cause?.code ?? null,
      message: "OpenDART 서버 연결 실패"
    });
  }
}
