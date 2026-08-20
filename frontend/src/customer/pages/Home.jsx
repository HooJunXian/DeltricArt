import Hero from "../../components/Hero";
import LatestProducts from "../../components/LatestProducts";
import FeaturedWorks from "../../components/FeaturedWorks";
import CreativePhilosophy from "../../components/CreativePhilosophy";
import StudioProcess from "../../components/StudioProcess";
import ProductCategories from "../../components/ProductCategories";

function Home() {
    return (
        <div className="-mt-[84px] space-y-16 pb-16">
            <Hero />
            <FeaturedWorks />
            <LatestProducts />
            <CreativePhilosophy />
            <StudioProcess />
            <ProductCategories />
        </div>
    )
}

export default Home

