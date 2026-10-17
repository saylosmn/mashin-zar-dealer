import { Redirect } from "expo-router";

// Дилерийн хувилбарт онцлох зарын төлбөр, агент, шимтгэлийн тайлан байхгүй.
export default function Removed() {
  return <Redirect href="/" />;
}
