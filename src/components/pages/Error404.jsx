import { Container, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

const Error404 = () => {
  return (
    <Container className="text-center my-5">
      <h1 className="display-1 fw-bold text-danger">404</h1>
      <h2>Página no encontrada</h2>
      <p className="lead">La página que buscas no existe o ha sido movida.</p>
      <Button as={Link} to="/" variant="primary">
        Volver al Inicio
      </Button>
    </Container>
  );
};

export default Error404;
