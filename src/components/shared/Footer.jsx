import { Container } from "react-bootstrap";

const Footer = () => {
  return (
    <footer className="bg-dark text-light text-center py-3 mt-auto">
      <Container>
        <p className="mb-0">&copy; {new Date().getFullYear()} Entrenamiento. Todos los derechos reservados - IgnacioLP</p>
      </Container>
    </footer>
  );
};

export default Footer;
