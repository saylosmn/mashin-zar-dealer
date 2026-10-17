import { redirect } from "next/navigation";

// Дилерийн хувилбарт онцлох зарын төлбөр, агентын систем байхгүй.
export default function Removed() {
  redirect("/");
}
