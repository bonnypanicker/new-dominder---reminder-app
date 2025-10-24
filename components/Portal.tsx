import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

interface PortalProps {
  children: ReactNode;
}

// Simple portal component for rendering at root level
export function Portal({ children }: PortalProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {children}
    </View>
  );
}
