// Allow importing global stylesheets and CSS modules (NativeWind / web).
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
