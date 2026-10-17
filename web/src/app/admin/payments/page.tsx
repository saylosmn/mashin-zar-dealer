import { redirect } from "next/navigation";

// Дилерийн хувилбарт төлбөр, шимтгэлийн тайлан, зар тавьсан хүмүүсийн жагсаалт байхгүй.
export default function Removed() {
  redirect("/admin");
}
