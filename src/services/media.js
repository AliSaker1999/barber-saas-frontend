import api from "./api";

export async function uploadImage(file, category = "misc") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const res = await api.post("/media/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return res.data.data;
}
