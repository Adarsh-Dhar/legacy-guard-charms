export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-md py-6 px-4 mt-12">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-sm text-muted-foreground font-light">
          Powered by <span className="text-primary font-semibold">BitcoinOS</span> &{" "}
          <span className="text-accent font-semibold">Charms Protocol</span>
        </p>
      </div>
    </footer>
  )
}
