/** @type {import('next').NextConfig} */
const nextConfig = {
	/* config options here */
	reactCompiler: true,
	images: {
		// Les fichiers dans /public sont accessibles automatiquement, mais
		// au besoin tu peux ajouter des domaines externes ici
		remotePatterns: [
			{
				protocol: "https",
				hostname: "placehold.co",
			},
			// Plus tard, pour ton domaine de prod :
			{
				protocol: "https",
				hostname: "academy.aeriavoyages.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
		],
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "100mb",
		},
	},
};

export default nextConfig;
