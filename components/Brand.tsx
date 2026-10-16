import Link from "@/components/SiteLink";
import { Box } from "lucide-react";
export default function Brand() {
  return (
    <Link className="brand" href="/" aria-label="CubeAppMaker home">
      <Box strokeWidth={1.6} />
      <span>
        CubeApp
        <br />
        Maker<small>.agency</small>
      </span>
    </Link>
  );
}
