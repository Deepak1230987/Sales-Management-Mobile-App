import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

// Skeleton loader component with shimmer effect
export const SkeletonLoader = ({ style }: { style: any }) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const shimmerColor = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#E5E5EA", "#F2F2F7"],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          backgroundColor: shimmerColor,
        },
      ]}
    />
  );
};

// Dashboard skeleton component
export const DashboardSkeleton = () => {
  return (
    <View style={skeletonStyles.container}>
      {/* Header skeleton */}
      <View style={skeletonStyles.header}>
        <SkeletonLoader style={skeletonStyles.headerTitle} />
        <SkeletonLoader style={skeletonStyles.headerIcon} />
      </View>

      {/* Stats cards skeleton */}
      <View style={skeletonStyles.statsContainer}>
        {[1, 2, 3, 4].map((index) => (
          <View key={index} style={skeletonStyles.statCard}>
            <SkeletonLoader style={skeletonStyles.statIcon} />
            <SkeletonLoader style={skeletonStyles.statNumber} />
            <SkeletonLoader style={skeletonStyles.statLabel} />
          </View>
        ))}
      </View>

      {/* Search bar skeleton */}
      <View style={skeletonStyles.searchContainer}>
        <SkeletonLoader style={skeletonStyles.searchBar} />
      </View>

      {/* Tabs skeleton */}
      <View style={skeletonStyles.tabsContainer}>
        {[1, 2].map((index) => (
          <SkeletonLoader key={index} style={skeletonStyles.tab} />
        ))}
      </View>

      {/* List items skeleton */}
      <View style={skeletonStyles.listContainer}>
        {[1, 2, 3, 4, 5].map((index) => (
          <View key={index} style={skeletonStyles.listItem}>
            <View style={skeletonStyles.listItemLeft}>
              <SkeletonLoader style={skeletonStyles.listItemIcon} />
              <View style={skeletonStyles.listItemText}>
                <SkeletonLoader style={skeletonStyles.listItemTitle} />
                <SkeletonLoader style={skeletonStyles.listItemSubtitle} />
              </View>
            </View>
            <SkeletonLoader style={skeletonStyles.listItemAmount} />
          </View>
        ))}
      </View>
    </View>
  );
};

// Table skeleton component
export const TableSkeleton = () => {
  return (
    <View style={skeletonStyles.container}>
      {/* Header */}
      <View style={skeletonStyles.header}>
        <SkeletonLoader style={skeletonStyles.headerTitle} />
        <SkeletonLoader style={skeletonStyles.headerIcon} />
      </View>

      {/* Search and filters */}
      <View style={skeletonStyles.searchContainer}>
        <SkeletonLoader style={skeletonStyles.searchBar} />
      </View>

      {/* Table header */}
      <View style={skeletonStyles.tableHeader}>
        {[1, 2, 3, 4].map((index) => (
          <SkeletonLoader key={index} style={skeletonStyles.tableHeaderCell} />
        ))}
      </View>

      {/* Table rows */}
      <View style={skeletonStyles.tableContainer}>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <View key={index} style={skeletonStyles.tableRow}>
            {[1, 2, 3, 4].map((cellIndex) => (
              <SkeletonLoader key={cellIndex} style={skeletonStyles.tableCell} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

// Form skeleton component
export const FormSkeleton = () => {
  return (
    <View style={skeletonStyles.container}>
      {/* Header */}
      <View style={skeletonStyles.header}>
        <SkeletonLoader style={skeletonStyles.headerTitle} />
        <SkeletonLoader style={skeletonStyles.headerIcon} />
      </View>

      {/* Form fields */}
      <View style={skeletonStyles.formContainer}>
        {[1, 2, 3, 4, 5].map((index) => (
          <View key={index} style={skeletonStyles.formField}>
            <SkeletonLoader style={skeletonStyles.formLabel} />
            <SkeletonLoader style={skeletonStyles.formInput} />
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={skeletonStyles.buttonContainer}>
        <SkeletonLoader style={skeletonStyles.button} />
        <SkeletonLoader style={skeletonStyles.button} />
      </View>
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 40,
  },
  headerTitle: {
    width: 150,
    height: 24,
    borderRadius: 4,
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  statNumber: {
    width: 30,
    height: 20,
    borderRadius: 4,
    marginBottom: 4,
  },
  statLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: 8,
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    width: 120,
    height: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  listItemSubtitle: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  listItemAmount: {
    width: 60,
    height: 16,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeaderCell: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  tableContainer: {
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tableCell: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  formContainer: {
    flex: 1,
  },
  formField: {
    marginBottom: 20,
  },
  formLabel: {
    width: 100,
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  formInput: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
  },
});
