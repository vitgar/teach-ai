import React from "react";
import {
  Link as RouterLink,
  LinkProps as RouterLinkProps,
} from "react-router-dom";

const LinkBehavior = React.forwardRef<HTMLAnchorElement, RouterLinkProps>(
  function LinkBehavior(props, ref) {
    return <RouterLink ref={ref} {...props} />;
  }
);
