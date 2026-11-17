
export default async function handler(req, res) {
  // 1. POST 요청만 허용
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "POST 요청만 허용합니다."
    });
  }

  // 2. Vercel 환경변수 확인
  const dartApiKey = process.env.DART_API_KEY;
  const proxySecret = process.env.PROXY_SECRET;

  if (!dartApiKey || !proxySecret) {
    return res.status(500).json({
      success: false,
      error: "서버 환경변수 설정 오류"
    });
  }

  // 3. 중계 서버 인증
  const authorization = req.headers.authorization;

  if (authorization !== `Bearer ${proxySecret}`) {
    return res.status(401).json({
      success: false,
      error: "중계 서버 인증 실패"
    });
  }

  // 4. 요청 데이터 검증
  const {
    corp_code,
    bsns_year,
    reprt_code,
    fs_div
  } = req.body ?? {};

  if (
    typeof corp_code !== "string" ||
    !/^\d{8}$/.test(corp_code) ||
    typeof bsns_year !== "string" ||
    !/^\d{4}$/.test(bsns_year) ||
    !["11013", "11012", "11014", "11011"].includes(reprt_code) ||
    !["OFS", "CFS"].includes(fs_div)
  ) {
    return res.status(400).json({
      success: false,
      error: "조회 조건이 올바르지 않습니다."
    });
  }

  // 5. OpenDART API 요청 주소
  const url = new URL(
    "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json"
  );

  url.searchParams.set("crtfc_key", dartApiKey);
  url.searchParams.set("corp_code", corp_code);
  url.searchParams.set("bsns_year", bsns_year);
  url.searchParams.set("reprt_code", reprt_code);
  url.searchParams.set("fs_div", fs_div);

  // 6. OpenDART API 호출
  let response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    console.error("OpenDART 네트워크 오류", {
      errorType: error?.name ?? "Unknown",
      errorCode: error?.cause?.code ?? null
    });

    return res.status(502).json({
      success: false,
      error: "OpenDART 서버 연결 실패",
      errorType: error?.name ?? "Unknown"
    });
  }

  // 7. HTTP 상태 확인
  if (!response.ok) {
    return res.status(502).json({
      success: false,
      error: "OpenDART HTTP 오류",
      httpStatus: response.status
    });
  }

  // 8. JSON 변환
  let data;

  try {
    data = await response.json();
  } catch {
    return res.status(502).json({
      success: false,
      error: "OpenDART JSON 응답 오류"
    });
  }

  // 9. OpenDART 조회 상태 확인
  if (data.status !== "000") {
    return res.status(200).json({
      success: false,
      dart_status: data.status ?? "UNKNOWN",
      message: data.message ?? "DART 조회 실패",
      list: []
    });
  }

  // 10. 정상 응답
  return res.status(200).json({
    success: true,
    corp_code,
    bsns_year,
    reprt_code,
    fs_div,
    count: data.list?.length ?? 0,
    list: data.list ?? []
  });
}
