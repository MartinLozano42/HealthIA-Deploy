export default class User {
  constructor(
    id,
    name,
    email,
    password,
    role,
    registrationDate,
    status,
    activationDate
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.role = role;
    this.registrationDate = registrationDate;
    this.status = status;
    this.activationDate = activationDate;
  }

  getActiveTime() {
    if (!this.activationDate) return null;

    const diffMs = Date.now() - new Date(this.activationDate).getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days === 0 && hours === 0) {
      return "Activo hace unos minutos";
    } else if (days === 0) {
      return `${hours} ${hours === 1 ? "hora" : "horas"} activo`;
    }

    return `${days} ${days === 1 ? "día" : "días"} y ${hours} ${
      hours === 1 ? "hora" : "horas"
    } activo`;
  }
}