/**
 * 获取已上传文件列表 API
 * 
 * 从文件记录中获取用户上传的文件
 */

export async function GET() {
  try {
    // 调用文件记录 API
    const response = await fetch("http://localhost:3000/api/file-records", {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error("获取文件列表失败")
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error: any) {
    console.error("获取文件列表错误:", error)
    return Response.json(
      { ok: false, error: "获取文件列表失败", files: [] },
      { status: 500 }
    )
  }
}
