import novologoOD from "@/assets/novologoOD.png";

const SiteFooter = () => {
  return (
    <footer className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center gap-1.5 text-center">
      <p className="text-xs text-muted-foreground">Desenvolvido por</p>
      <img
        src={novologoOD}
        alt="Onurb Digital"
        className="h-7 w-auto object-contain opacity-90"
      />
    </footer>
  );
};

export default SiteFooter;
