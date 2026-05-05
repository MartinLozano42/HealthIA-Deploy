export const TAB_SCREEN_CONFIG = [
  { name: "index", title: "Inicio", iconPack: "feather", iconName: "home" },
  {
    name: "diet",
    title: "Dieta",
    iconPack: "material",
    iconName: "restaurant",
  },
  {
    name: "stats",
    title: "Stats",
    iconPack: "material",
    iconName: "bar-chart",
  },
  { name: "profile", title: "Perfil", iconPack: "feather", iconName: "user" },
];

export const buildTabOptions = ({ Feather, MaterialIcons }) => {
  return TAB_SCREEN_CONFIG.reduce((acc, item) => {
    const IconComponent = item.iconPack === "feather" ? Feather : MaterialIcons;

    acc[item.name] = {
      title: item.title,
      tabBarIcon: ({ color, size }) => (
        <IconComponent name={item.iconName} size={size} color={color} />
      ),
    };

    return acc;
  }, {});
};
