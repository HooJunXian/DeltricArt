import logo from "./deltric_logo_horizontal.png";
import hero_img from "./hero_img.png";
import cart_icon from "./cart_icon.png";
import bin_icon from "./bin_icon.png";
import dropdown_icon from "./dropdown_icon.png";
import exchange_icon from "./exchange_icon.png";
import profile_icon from "./profile_icon.png";
import quality_icon from "./quality_icon.png";
import search_icon from "./search_icon.png";
import star_dull_icon from "./star_dull_icon.png";
import star_icon from "./star_icon.png";
import support_img from "./support_img.png";
import menu_icon from "./menu_icon.png";
import about_img from "./about_img.png";
import contact_img from "./contact_img.png";
import razorpay_logo from "./razorpay_logo.png";
import stripe_logo from "./stripe_logo.png";
import cross_icon from "./cross_icon.png";
import oilpainting_1 from "./Products/oilpainting_1.png";
import oilpainting_2 from "./Products/oilpainting_2.png";
import oilpainting_3 from "./Products/oilpainting_3.png";
import sculpture_1 from "./Products/sculpture_1.png";
import sculpture_2 from "./Products/sculpture_2.png";
import sculpture_3 from "./Products/sculpture_3.png";

export const assets = {
  logo,
  hero_img,
  cart_icon,
  dropdown_icon,
  exchange_icon,
  profile_icon,
  quality_icon,
  search_icon,
  star_dull_icon,
  star_icon,
  bin_icon,
  support_img,
  menu_icon,
  about_img,
  contact_img,
  razorpay_logo,
  stripe_logo,
  cross_icon,
  oilpainting_1,
  oilpainting_2,
  oilpainting_3,
  sculpture_1,
  sculpture_2,
  sculpture_3,
};

export const products = [
  {
    _id: "art001",
    name: "Crimson Stillness",
    description:
      "A dramatic oil painting built around deep crimson pigments, warm shadows, and a museum-style presence.",
    price: 1800,
    image: [oilpainting_1],
    category: "Painting",
    subCategory: "Oil Painting",
    sizes: ["Original"],
    date: 1716668445448,
    bestseller: true,
  },
  {
    _id: "art002",
    name: "Quiet Horizon",
    description:
      "An atmospheric oil painting with softened edges and a slower rhythm, ideal for calm gallery-inspired interiors.",
    price: 2100,
    image: [oilpainting_2],
    category: "Painting",
    subCategory: "Oil Painting",
    sizes: ["Original"],
    date: 1716667445448,
    bestseller: true,
  },
  {
    _id: "art003",
    name: "Golden Echo",
    description:
      "A luminous oil painting layered with warm highlights and textured brushwork that shifts beautifully with light.",
    price: 2400,
    image: [oilpainting_3],
    category: "Painting",
    subCategory: "Oil Painting",
    sizes: ["Original"],
    date: 1716666445448,
    bestseller: true,
  },
  {
    _id: "art004",
    name: "Marble Reverie",
    description:
      "A sculpture study with a refined silhouette and a quiet, contemplative character suited to a curated modern space.",
    price: 3200,
    image: [sculpture_1],
    category: "Sculpture",
    subCategory: "Gallery Sculpture",
    sizes: ["Edition"],
    date: 1716665445448,
    bestseller: false,
  },
  {
    _id: "art005",
    name: "Stone Gesture",
    description:
      "A sculptural piece that balances tension and grace, inspired by hand-carved forms and collector editions.",
    price: 3600,
    image: [sculpture_2],
    category: "Sculpture",
    subCategory: "Gallery Sculpture",
    sizes: ["Edition"],
    date: 1716664445448,
    bestseller: false,
  },
  {
    _id: "art006",
    name: "Ivory Form",
    description:
      "A sculptural composition with clean contours and soft highlights, designed to feel timeless and architectural.",
    price: 3900,
    image: [sculpture_3],
    category: "Sculpture",
    subCategory: "Gallery Sculpture",
    sizes: ["Edition"],
    date: 1716663445448,
    bestseller: false,
  },
];
